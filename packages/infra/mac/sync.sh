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
echo "Fetching origin/main"
git fetch -q origin main

if ! git diff --quiet HEAD; then
    echo "Staging all changes"
    git add -A
    git commit -q -m "save"
else
    echo "No changes to commit"
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
    if ! git merge-tree "$MERGE_BASE" "$LOCAL_TREE" "$REMOTE_TREE" | grep -q "^+<<<<<<< "; then
        echo "No conflicts detected, pulling"
        git pull -q origin main
    else
        echo "Potential conflicts detected. Aborting sync."
        exit 1
    fi
fi

echo "Pushing to origin/main"
git push -q origin main
