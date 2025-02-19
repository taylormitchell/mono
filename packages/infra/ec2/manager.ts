#!/usr/bin/env bun
import { $ } from "bun";
import { resolve } from "path";
import { setDomainIp } from "../dns";

export const config = {
  name: "my-micro-server",
  username: "ec2-user",
  imageId: "ami-0c518311db5640eff",
  sshKeyFile: resolve(process.env.HOME!, ".ssh/id_ed25519"),
  instanceType: "t4g.micro",
  domain: "taylors.tech",
  email: "taylor.j.mitchell@gmail.com",
  region: "us-east-1",
  repoDir: "/home/ec2-user/code/home",
} as const;

const REMOTE_CONFIG_PATH = "/home/ec2-user/nginx-apps.json";
const TMP_CONF_PATH = "/tmp/nginx.conf";
const NGINX_CONF_PATH = "/etc/nginx/nginx.conf";

type AppConfig = Record<string, { subdomain: string; port: number }>;

let _ip: string | null = null;
async function getIp() {
  if (_ip) return _ip;
  const res = await $`aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=${config.name}" "Name=instance-state-name,Values=running,pending,stopped,stopping" \
    --region ${config.region} \
    --query "Reservations[*].Instances[*].PublicIpAddress" \
    --output text`.quiet();
  _ip = res.text().trim();
  return _ip;
}

export async function getRemoteHost() {
  const ip = _ip ?? (await getIp());
  return `${config.username}@${ip}`;
}

async function loadAppConfig(): Promise<AppConfig> {
  const ip = await getIp();
  const remoteHost = `${config.username}@${ip}`;

  try {
    const appsConfig = await $`ssh ${remoteHost} "cat ${REMOTE_CONFIG_PATH}"`.quiet();
    return JSON.parse(appsConfig.text());
  } catch (error) {
    // If file doesn't exist, return empty apps object
    return {};
  }
}

async function saveAppConfig(apps: AppConfig): Promise<void> {
  const ip = await getIp();
  const remoteHost = `${config.username}@${ip}`;
  const appsConfig = JSON.stringify(apps, null, 2);

  // Write apps config to temporary file and copy to server
  const tempFile = `/tmp/nginx-apps-${Date.now()}.json`;
  await Bun.write(tempFile, appsConfig);
  try {
    await $`scp ${tempFile} ${remoteHost}:${REMOTE_CONFIG_PATH}`.quiet();
  } finally {
    await $`rm ${tempFile}`;
  }
}

export async function pushNginxConf() {
  const apps = await loadAppConfig();
  const fullConfig = `
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    client_max_body_size 50M;
    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Default server for the main domain
    server {
        listen       80 default_server;
        listen       [::]:80 default_server;
        server_name  ${config.domain};
        root         /usr/share/nginx/html;

        location / {
            proxy_pass http://localhost:3078;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }

    ${Object.values(apps)
      .map(
        ({ subdomain, port }) => `
    server {
        listen 80;
        server_name ${subdomain}.${config.domain};
    
        location / {
            proxy_pass http://localhost:${port};
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }`
      )
      .join("\n")}
}`;

  // Write to local temp file
  const tempFile = `nginx-${Date.now()}.conf`;
  await Bun.write(tempFile, fullConfig);

  try {
    const ip = await getIp();
    const remoteHost = `${config.username}@${ip}`;
    console.log(`Copying ${tempFile} to ${remoteHost}:${TMP_CONF_PATH}`);
    await $`scp ${tempFile} ${remoteHost}:${TMP_CONF_PATH}`;

    console.log(`Moving ${tempFile} to ${NGINX_CONF_PATH} and testing`);
    await $`ssh ${remoteHost} 'sudo mv ${TMP_CONF_PATH} ${NGINX_CONF_PATH} && sudo nginx -t && sudo systemctl reload nginx'`.quiet();

    console.log("Updating ssl certificate");
    await $`ssh ${remoteHost} 'echo "1" | sudo certbot --nginx --expand --email ${
      config.email
    } -d ${config.domain} -d ${Object.values(apps)
      .map((app) => `${app.subdomain}.${config.domain}`)
      .join(" -d ")}'`;
  } catch (error) {
    console.error("❌ Failed to update nginx configuration:", error);
  } finally {
    await $`rm ${tempFile}`;
  }
}

export async function exec(cmd: string) {
  const ip = await getIp();
  const remoteHost = `${config.username}@${ip}`;
  await $`ssh ${remoteHost} '${cmd}'`;
}

export async function listApps() {
  const apps = await loadAppConfig();

  if (Object.keys(apps).length === 0) {
    console.log("\nNo apps configured");
    console.log(`Domain: ${config.domain}`);
    return;
  }

  console.log("\nCurrent configuration:");
  console.log(`Domain: ${config.domain}`);
  console.log("\nConfigured apps:");
  console.log("---------------");
  for (const [name, app] of Object.entries(apps)) {
    console.log(`${app.subdomain}.${config.domain} -> port ${app.port}`);
  }
  console.log();
}

export async function addApp(name: string, port: number, subdomain?: string) {
  const apps = await loadAppConfig();
  subdomain = subdomain ?? name;
  if (Object.entries(apps).some(([n, app]) => n !== name && app.port === port)) {
    throw new Error(`App '${name}' (${subdomain}.${config.domain} -> port ${port}) already exists`);
  }
  apps[name] = { subdomain, port };
  await saveAppConfig(apps);
  console.log(`Added app '${name}' (${subdomain}.${config.domain} -> port ${port})`);
  return apps;
}

async function removeApp(name: string) {
  const apps = await loadAppConfig();
  if (!(name in apps)) {
    console.error(`App '${name}' not found`);
    return;
  }
  delete apps[name];
  await saveAppConfig(apps);
  console.log(`Removed app '${name}'`);
}

async function provision({ sshPubkey }: { sshPubkey: string }) {
  const securityGroupName = `${config.name}-security-group`;

  // Check if security group exists
  try {
    await $`aws ec2 describe-security-groups --group-names ${securityGroupName} --region ${config.region}`.quiet();
    console.log(`Security group '${securityGroupName}' already exists`);
  } catch (error) {
    // If security group doesn't exist, create it
    console.log(`Creating security group '${securityGroupName}'...`);
    const createSgResult = await $`
      aws ec2 create-security-group \
      --group-name ${securityGroupName} \
      --description "Security group for ${config.name}" \
      --region ${config.region}
    `;

    // Add inbound rules for SSH, HTTP, and HTTPS
    const sgId = JSON.parse(createSgResult.text()).GroupId;
    await $`
          aws ec2 authorize-security-group-ingress \
          --group-id ${sgId} \
          --protocol tcp \
          --port 22 \
          --cidr 0.0.0.0/0 \
          --region ${config.region}
        `.quiet();

    await $`
          aws ec2 authorize-security-group-ingress \
          --group-id ${sgId} \
          --protocol tcp \
          --port 80 \
          --cidr 0.0.0.0/0 \
          --region ${config.region}
        `.quiet();

    await $`
          aws ec2 authorize-security-group-ingress \
          --group-id ${sgId} \
          --protocol tcp \
          --port 443 \
          --cidr 0.0.0.0/0 \
          --region ${config.region}
        `.quiet();
  }

  // Check if instance exists
  const instanceExists = await $`aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=${config.name}" "Name=instance-state-name,Values=running,pending,stopped,stopping" \
    --region ${config.region} \
    --query "Reservations[*].Instances[*]" \
    --output json`.quiet();

  if (JSON.parse(instanceExists.text()).flat().length > 0) {
    console.log(`Instance '${config.name}' already exists`);
    return;
  }

  // Create instance if it doesn't exist
  console.log(`Creating instance '${config.name}'...`);
  await $`
    aws ec2 run-instances \
    --image-id ${config.imageId} \
    --instance-type ${config.instanceType} \
    --security-groups ${securityGroupName} \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=${config.name}}]' \
    --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":8,"VolumeType":"gp3"}}]' \
    --region ${config.region} \
    --user-data "#!/bin/bash
      mkdir -p /home/ec2-user/.ssh
      echo \"${sshPubkey}\" > /home/ec2-user/.ssh/authorized_keys
      chmod 600 /home/ec2-user/.ssh/authorized_keys
      chown -R ec2-user:ec2-user /home/ec2-user/.ssh
    "
  `;
}

async function setup() {
  const ip = await getIp();
  const remoteHost = `${config.username}@${ip}`;
  console.log(`Setting up server at ${remoteHost}`);

  // Update DNS record
  await setDomainIp({ domain: config.domain, ip });

  // Copy ssh key to server. This gives it access to my github repos
  await $`scp ~/.ssh/my-micro-server ${remoteHost}:~/.ssh/`.quiet();
  await $`ssh ${remoteHost} '
    chmod 600 ~/.ssh/my-micro-server
    echo "eval $(ssh-agent -s) > /dev/null" >> ~/.bashrc
    echo "ssh-add ~/.ssh/my-micro-server > /dev/null" >> ~/.bashrc
  '`;

  await $`ssh ${remoteHost} '
    # Set hostname
    sudo hostnamectl set-hostname ${config.name}

    # Add alias to clear the terminal
    echo "alias x='clear'" >> ~/.bashrc

    # Install git
    sudo yum install -y git

    # Install bun
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc

    # Install node
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs

    # Install pm2
    sudo npm install -g pm2

    # Install nginx
    sudo yum install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx

    # Clone the repo
    mkdir ~/code
    cd ~/code
    git clone git@github.com:taylormitchell/home.git

    # Install certbot
    sudo yum install certbot -y
    sudo yum install certbot-nginx -y
  '`;

  // TODO set IP on taylor.tech A record. not sure if to do here or elsewhere
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "provision":
      const sshPubkey = await Bun.file(resolve(process.env.HOME!, ".ssh/id_ed25519.pub")).text();
      await provision({ sshPubkey });
      break;

    case "setup":
      await setup();
      break;

    case "get-ip":
      const ip = await getIp();
      console.log(ip);
      break;

    case "list":
      await listApps();
      break;

    case "add":
      if (args.length < 2) {
        console.error("Usage: add <name> <port> [subdomain]");
        process.exit(1);
      }
      await addApp(args[0], parseInt(args[1], 10), args[2]);
      break;

    case "remove":
      if (args.length !== 1) {
        console.error("Usage: remove <name>");
        process.exit(1);
      }
      await removeApp(args[0]);
      break;

    case "push":
      await pushNginxConf();
      break;

    default:
      console.log(`
Usage: bun nginx-manager.ts <command>

Commands:
  list                       List all apps and settings
  add <name> <port> [subdomain]    Add a new app
  remove <name>              Remove an app
  push                       Push the nginx config to the server
      `);
      process.exit(1);
  }
}

// Only run main if this is being executed as a script
if (import.meta.main) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
