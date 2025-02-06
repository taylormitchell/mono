#!/usr/bin/env bun
import { $ } from "bun";
import { resolve } from "path";

import { z } from "zod";

const ConfigSchema = z.object({
  domain: z.string(),
  sshHost: z.string(),
  repoDir: z.string(),
  apps: z.record(
    z.string(),
    z.object({
      subdomain: z.string(),
      port: z.number().int().positive(),
    })
  ),
});

type Config = z.infer<typeof ConfigSchema>;

const CONFIG_PATH = resolve(__dirname, "./config.json");
const TMP_CONF_PATH = "/tmp/nginx.conf";
const NGINX_CONF_PATH = "/etc/nginx/nginx.conf";

async function loadConfig(): Promise<Config> {
  const configFile = Bun.file(CONFIG_PATH);
  if (!(await configFile.exists())) {
    throw new Error(`Config file not found at ${CONFIG_PATH}`);
  }
  const file = await configFile.text();
  const config = JSON.parse(file);
  return ConfigSchema.parse(config);
}

async function saveConfig(config: Config): Promise<void> {
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function pushNginxConf() {
  const config = await loadConfig();
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

    ${Object.values(config.apps)
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
    console.log(`Copying ${tempFile} to ${config.sshHost}:${TMP_CONF_PATH}`);
    await $`scp ${tempFile} ${config.sshHost}:${TMP_CONF_PATH}`;

    console.log(`Moving ${tempFile} to ${NGINX_CONF_PATH} and testing`);
    await $`ssh ${config.sshHost} 'sudo mv ${TMP_CONF_PATH} ${NGINX_CONF_PATH} && sudo nginx -t && sudo systemctl reload nginx'`.quiet();

    console.log("Updating ssl certificate");
    await $`ssh ${config.sshHost} 'sudo certbot --nginx -d ${config.domain} -d ${Object.values(
      config.apps
    )
      .map((app) => `${app.subdomain}.${config.domain}`)
      .join(" -d ")} --expand --deploy-hook "nginx -s reload" --keep-until-expiring'`;
  } catch (error) {
    console.error("❌ Failed to update nginx configuration:", error);
  } finally {
    await $`rm ${tempFile}`;
  }
}

async function pullRepo() {
  const config = await loadConfig();
  await $`ssh ${config.sshHost} 'cd ${config.repoDir} && git pull'`;
}

async function listApps() {
  const config = await loadConfig();

  if (Object.keys(config.apps).length === 0) {
    console.log("\nNo apps configured");
    console.log(`Domain: ${config.domain}`);
    console.log(`SSH Host: ${config.sshHost}`);
    return;
  }

  console.log("\nCurrent configuration:");
  console.log(`Domain: ${config.domain}`);
  console.log(`SSH Host: ${config.sshHost}`);
  console.log("\nConfigured apps:");
  console.log("---------------");
  for (const [name, app] of Object.entries(config.apps)) {
    console.log(`${app.subdomain}.${config.domain} -> port ${app.port}`);
  }
  console.log();
}

async function addApp(name: string, port: number, subdomain?: string) {
  const config = await loadConfig();
  subdomain = subdomain ?? name;
  config.apps[name] = { subdomain, port };
  await saveConfig(config);
  console.log(`Added app '${name}' (${subdomain}.${config.domain} -> port ${port})`);
  return config;
}

async function removeApp(name: string) {
  const config = await loadConfig();
  if (!(name in config.apps)) {
    console.error(`App '${name}' not found`);
    return;
  }
  delete config.apps[name];
  await saveConfig(config);
  console.log(`Removed app '${name}'`);
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
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

export { loadConfig, saveConfig, pushNginxConf, listApps, addApp, removeApp, pullRepo };

// Only run main if this is being executed as a script
if (import.meta.main) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
