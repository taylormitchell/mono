import * as ec2 from "../../infra/ec2/manager";
import { $ } from "bun";

async function main() {
  // Build client
  await $`cd client && npm run build`;

  // Add app to nginx
  const apps = await ec2.addApp("log", 3079);
  await ec2.pushNginxConf();

  // Pull repo
  await ec2.exec(`cd ${ec2.config.repoDir} && git pull`);
  const appDir = ec2.config.repoDir + "/packages/log2";

  // Copy build to server
  const remoteHost = await ec2.getRemoteHost();
  await ec2.exec(`rm -rf ${appDir}/client/dist`);
  await $`scp -r client/dist ${remoteHost}:${appDir}/client/`;

  // Copy envs to server
  await $`scp server/.env.production ${remoteHost}:${appDir}/server/.env`;
  await $`scp client/.env.production ${remoteHost}:${appDir}/client/.env`;

  // Install deps, build, and start
  await ec2.exec(`
    cd ${appDir}/server &&
    npm install &&
    bun run db:up &&
    echo >> .env && echo "PORT=${apps.log.port}" >> .env &&
    pm2 delete log || true && pm2 start "bun start" --name log
  `);
}

main();
