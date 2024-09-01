date=$(date -u +"%Y-%m-%d")
bun cli.ts daily $date -n
git add --all
git commit -m "save"
git push
