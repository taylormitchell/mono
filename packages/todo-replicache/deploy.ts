import * as nginxManager from "../infra/ec2/nginx-manager";

async function main() {
  await nginxManager.addApp("items", 3078);
  await nginxManager.push();
  const config = await nginxManager.loadConfig();
  //   await $`ssh ${config.sshHost} '
  //     cd ~/code/packages/todo-replicache &&
  //     git pull &&
  //     cd client &&
  //     npm install &&
  //     npm run build &&
  //     cd ../server &&
  //     npm install &&
  //     npm run build &&
  //     pm2 restart todo-replicache
  //   '`;
}

main();
