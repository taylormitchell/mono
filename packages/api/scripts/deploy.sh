#!/bin/bash
git add --all
git commit -m "Deploy"
git push
scp .env ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com:~/code/taylors-tech/packages/api/.env
ssh ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com '
  cd code/taylors-tech/packages/api &&
  git pull &&
  npm run build &&
  pm2 delete api || true &&
  pm2 start npm --name api -- run start
'