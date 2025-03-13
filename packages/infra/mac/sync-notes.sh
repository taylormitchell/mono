#!/bin/bash

echo "Starting notes sync"

# Source the git helper functions
git_helpers_path="$HOME/Code/mono/packages/infra/mac/git-helpers.sh"
if [ ! -f "$git_helpers_path" ]; then
    echo "ERROR: git-helpers.sh not found at $git_helpers_path" >&2
    exit 1
fi
source "$git_helpers_path"

# Sync the notes directory
notes_dir="$HOME/Dropbox/data/notes"
if [ ! -d "$notes_dir" ]; then
    echo "ERROR: notes directory not found at $notes_dir" >&2
    exit 1
fi
cd "$notes_dir"
gsync

echo "Notes sync complete"