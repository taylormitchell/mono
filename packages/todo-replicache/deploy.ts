import * as ec2 from "../infra/ec2/manager";
import { $ } from "bun";

async function main() {
  const config = await ec2.addApp("items", 3078);
  await ec2.pushNginxConf();
  await ec2.pullRepo();
  const appDir = config.repoDir + "/packages/todo-replicache";
  await $`scp server/.env.production ${config.sshHost}:~/code/home/packages/todo-replicache/server/.env`;
  await $`scp client/.env.production ${config.sshHost}:~/code/home/packages/todo-replicache/client/.env`;
  await $`ssh ${config.sshHost} '
        cd ${config.repoDir} &&
        cd client && npm install && npm run build &&
        cd ../server && npm install && npm run build &&
        echo PORT=${config.apps.items.port} >> .env &&
        pm2 delete items || true && pm2 start "bun start" --name items
      '`;
}

main();
