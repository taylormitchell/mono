# adds a cron job which runs `bun cli.ts 2024-09-01` (but with absolute path for cli.ts and the date when the cron runs) 
date=$(date -u +"%Y-%m-%d")
echo "Adding cron job for $date"

cli_dir=$(dirname $cli_path)

# create daily note, commit, and push
job="0 0 * * * cd $cli_dir && bun cli.ts daily $date -n && git add . && git commit -m 'save' && git push"

# Check if the job already exists in the crontab
if ! crontab -l | grep -Fq "$job"; then
    # If the job doesn't exist, add it to the crontab
    (crontab -l 2>/dev/null; echo "$job") | crontab -
    echo "Cron job added successfully."
else
    echo "Cron job already exists. No changes made."
fi