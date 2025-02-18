import * as ec2 from "../../infra/ec2/manager";
import { $ } from "bun";

async function main() {
  // Build client
  await $`cd client && npm run build`;

  // Add app to nginx
  const apps = await ec2.addApp("items", 3078);
  await ec2.pushNginxConf();
  const remoteHost = await ec2.getRemoteHost();

  // Pull repo
  await $`ssh ${remoteHost} 'cd ${ec2.config.repoDir} && git pull'`;

  // Copy build to server
  const appDir = ec2.config.repoDir + "/packages/todo-replicache";
  await $`ssh ${remoteHost} 'rm -rf ${appDir}/client/dist'`;
  await $`scp -r client/dist ${remoteHost}:${appDir}/client/`;

  // Copy envs to server
  await $`scp server/.env.production ${remoteHost}:${appDir}/server/.env`;
  await $`scp client/.env.production ${remoteHost}:${appDir}/client/.env`;

  // Install deps, build, and start
  await $`ssh ${remoteHost} '
    cd ${appDir}/server &&
    npm install &&
    bun run db:up &&
    echo .env && echo PORT=${apps.items.port} >> .env &&
    pm2 delete items || true && pm2 start "bun start" --name items
  '`;
}

main();
