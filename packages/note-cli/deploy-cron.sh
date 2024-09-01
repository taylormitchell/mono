# adds a cron job which runs `bun cli.ts 2024-09-01` (but with absolute path for cli.ts and the date when the cron runs) 
date=$(date -u +"%Y-%m-%d")
echo "Adding cron job for $date"

# get the absolute path of the cli.ts file
cli_path=$(realpath cli.ts)

job="0 0 * * * bun $cli_path $date"

# Check if the job already exists in the crontab
if ! crontab -l | grep -Fq "$job"; then
    # If the job doesn't exist, add it to the crontab
    (crontab -l 2>/dev/null; echo "$job") | crontab -
    echo "Cron job added successfully."
else
    echo "Cron job already exists. No changes made."
fi