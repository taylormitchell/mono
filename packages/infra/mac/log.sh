#!/bin/bash
# Crontab logging script
# Logs output from jobs run by crontab to a file
# Usage: some-command | log.sh [job-name]

DEFAULT_LOG_DIR="$HOME/Dropbox/data/logs"
DEFAULT_LOG_FILE="$DEFAULT_LOG_DIR/crontab.log"
job_name=$1

function short_id() {
    head /dev/urandom | LC_ALL=C tr -dc 'a-z0-9' | head -c 6
}

# Example: "sync" -> "sync-job-1715619600" and "" -> "job-1715619600"
job_id="${job_name:+${job_name}-}job-$(short_id)"

# Create log directory if it doesn't exist
if [ ! -d "$DEFAULT_LOG_DIR" ]; then
    mkdir -p "$DEFAULT_LOG_DIR" || {
        echo "ERROR: Failed to create log directory: $DEFAULT_LOG_DIR" >&2
        exit 1
    }
fi

# Log each line to the log file
while IFS= read -r line || [ -n "$line" ]; do  # The -n "$line" part handles the last line if it doesn't end with a newline
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$job_id] $line" >> "$DEFAULT_LOG_FILE"
done

exit 0