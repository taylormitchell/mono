#!/bin/bash
git add --all
git commit -m "Deploy"
git push
scp client/.env.production ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com:~/code/taylors-tech/packages/todos/client/.env.production
ssh ec2-user@ec2-3-92-45-253.compute-1.amazonaws.com '
  cd code/taylors-tech/packages/todos &&
  git pull &&
  npm run build &&
  pm2 delete todos &&
  pm2 start npm --name todos -- run start
'