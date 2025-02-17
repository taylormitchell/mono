import * as ec2 from "../../infra/ec2/manager";
import { $ } from "bun";

async function main() {
  await $`cd client && npm run build`;
  const config = await ec2.addApp("items", 3078);
  await ec2.pushNginxConf();
  await ec2.pullRepo();
  const appDir = config.repoDir + "/packages/todo-replicache";

  // Copy build to server
  await $`ssh ${config.sshHost} 'rm -rf ${appDir}/client/dist'`;
  await $`scp -r client/dist ${config.sshHost}:${appDir}/client/`;

  // Copy envs to server
  await $`scp server/.env.production ${config.sshHost}:${appDir}/server/.env`;
  await $`scp client/.env.production ${config.sshHost}:${appDir}/client/.env`;

  // Install deps, build, and start
  await $`ssh ${config.sshHost} '
        cd ${appDir}/server &&
        npm install &&
        bun run db:up &&
        echo .env && echo PORT=${config.apps.items.port} >> .env &&
        pm2 delete items || true && pm2 start "bun start" --name items
      '`;
}

main();
