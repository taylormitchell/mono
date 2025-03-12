import * as ec2 from "../../infra/ec2/manager";
import { $ } from "bun";
import dotenv from "dotenv";

async function main() {
  // Load env
  dotenv.config({ path: "../server/.env.production" });
  const port = Number(process.env.PORT);
  if (isNaN(port)) {
    throw new Error("PORT is not set");
  }

  // Build client
  await $`cd client && bun run build`;

  // Add app to nginx
  const apps = await ec2.addApp("git-knowledge-base", port);
  await ec2.pushNginxConf();

  const remoteHost = await ec2.getRemoteHost();

  // Pull repo
  await $`ssh ${remoteHost} 'cd ${ec2.config.repoDir} && git pull'`;

  // Copy build to server
  const appDir = ec2.config.repoDir + "/packages/git-knowledge-base";
  await $`ssh ${remoteHost} 'rm -rf ${appDir}/client/dist'`;
  await $`scp -r client/dist ${remoteHost}:${appDir}/client/`;

  // Copy envs to server
  await $`scp server/.env.production ${remoteHost}:${appDir}/server/.env`;
  await $`scp client/.env.production ${remoteHost}:${appDir}/client/.env`;

  // Install deps, build, and start
  const cacheDir = "/home/ec2-user/data/git-knowledge-base";
  const cachePath = `${cacheDir}/commit-cache.json`;
  const repoPath = "/home/ec2-user/data/notes";
  await $`ssh ${remoteHost} '
    mkdir -p ${cacheDir} &&
    cd ${appDir}/shared && bun install &&
    cd ${appDir}/server && bun install &&
    cd ${appDir}/server && pm2 delete git-knowledge-base || true && pm2 start "bun start" --name git-knowledge-base
  '`;
}

main();
