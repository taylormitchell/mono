import * as nginxManager from "../infra/ec2/nginx-manager";

async function main() {
  await nginxManager.addApp("items", 3078);
  await nginxManager.push();
  const config = await nginxManager.loadConfig();
  await $`scp server/.env.production ${config.sshHost}:~/code/home/packages/todo-replicache/server/.env`;
  await $`ssh ${config.sshHost} '
      cd ~/code/home/packages/todo-replicache &&
      git pull &&
      cd client && npm install && npm run build &&
      cd ../server && npm install && npm run build &&
      echo PORT=${config.apps.items.port} >> .env &&
      pm2 restart todo-replicache
    '`;
}

main();
