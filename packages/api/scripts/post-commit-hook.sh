#!/bin/sh

# Create function to log with timestamp
root=$(git rev-parse --show-toplevel)
log_file=$root/temp.log
if [ ! -f $log_file ]; then
    touch $log_file
fi
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $log_file
}

# Fetch the latest changes from the remote
git fetch origin

# Attempt to rebase
if git rebase origin/main; then
    log "Rebase successful, pushing changes..."
    if git push origin main; then
        log "Push successful"
    else
        log "Error: Failed to push changes"
        exit 1
    fi
else
    log "Error: Rebase failed"
    # Abort the rebase to return to the previous state
    git rebase --abort
    exit 1
fi