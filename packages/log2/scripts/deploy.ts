import * as ec2 from "../../infra/ec2/manager";
import { $ } from "bun";

async function main() {
  try {
    await $`cd client && npm run typecheck`;
  } catch (e) {
    console.error("Typecheck failed - aborting deploy");
    process.exit(1);
  }
  const config = await ec2.addApp("log", 3079);
  await ec2.pushNginxConf();
  await ec2.pullRepo();
  const appDir = config.repoDir + "/packages/log2";
  await $`scp server/.env.production ${config.sshHost}:${appDir}/server/.env`;
  await $`scp client/.env.production ${config.sshHost}:${appDir}/client/.env`;
  await $`ssh ${config.sshHost} '
        cd ${appDir} &&
        cd client && npm install && npm run build &&
        cd ../server && npm install &&
        bun run db:up &&
        echo "\nPORT=${config.apps.log.port}" >> .env &&
        pm2 delete log || true && pm2 start "bun start" --name log
      '`;
}

main();
