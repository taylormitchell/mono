#!/bin/bash

# Exit immediately if any command fails
set -e

# # Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Not on main branch. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# # Fetch the latest changes without merging
git fetch origin main

# # Check if there are any uncommitted changes
if ! git diff --quiet HEAD; then
    # Stage all changes
    git add -A
    # Commit with message "save"
    git commit -m "save"
fi

# Check if pulling would result in conflicts
# Get the merge base (common ancestor)
MERGE_BASE=$(git merge-base HEAD origin/main)
# Get the local and remote trees at merge base
LOCAL_TREE=$(git rev-parse HEAD)
REMOTE_TREE=$(git rev-parse origin/main)

# If merge-base is different from either local or remote, we need to check for conflicts
if [ "$MERGE_BASE" != "$LOCAL_TREE" ] && [ "$MERGE_BASE" != "$REMOTE_TREE" ]; then
    # Try to merge without committing to check for conflicts
    if ! git merge-tree "$MERGE_BASE" "$LOCAL_TREE" "$REMOTE_TREE" | grep -q "^<<<<<<< "; then
        # No conflicts detected, safe to pull
        git pull origin main
    else
        echo "Potential conflicts detected. Aborting sync."
        exit 1
    fi
fi

# # Push changes to remote
git push origin main
