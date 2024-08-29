#!/bin/bash

# Define the cron job command
CRON_COMMAND="0 0 * * * cd $(pwd) && ~/.bun/bin/bun index.ts"

# Check if the cron job already exists
if ! crontab -l 2>/dev/null | grep -Fq "$CRON_COMMAND"; then
    # Add bun index.ts to cron if it doesn't exist
    (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
    echo "Cron job added successfully."
else
    echo "Cron job already exists. No changes made."
fi