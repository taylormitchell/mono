curdir=$(pwd)
date=$(date -u +"%Y-%m-%d")
cd $curdir
bun cli.ts daily $date -n
git add .
git commit -m "save"
git push
