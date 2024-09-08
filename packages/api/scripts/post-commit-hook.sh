#!/bin/sh

root=$(git rev-parse --show-toplevel)
log=$root/temp.log
if [ ! -f $log ]; then
    touch $log
fi

# Fetch the latest changes from the remote
git fetch origin

# Attempt to rebase
if git rebase origin/main; then
    echo "Rebase successful, pushing changes..." >> $log
    if git push origin main; then
        echo "Push successful" >> $log
    else
        echo "Error: Failed to push changes" >> $log
        exit 1
    fi
else
    echo "Error: Rebase failed" >> $log
    # Abort the rebase to return to the previous state
    git rebase --abort
    exit 1
fi