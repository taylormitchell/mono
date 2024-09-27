#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration Variables (modify these as needed)
NEW_REPO_URL="https://github.com/taylormitchell/mono.git"  # URL of your new public GitHub repository
NEW_REPO_PATH="/tmp/mono"

# Check if the script is run inside a Git repository
if [ ! -d ".git" ]; then
    echo "Error: This script must be run from the root of a Git repository."
    exit 1
fi

# Remove the existing public repository if it exists
if [ -d "$NEW_REPO_PATH" ]; then
    rm -rf "$NEW_REPO_PATH"
fi

# Create a new directory for the public repository
mkdir "$NEW_REPO_PATH"

# Use rsync to copy files, excluding the specified directory and the .git directory
rsync -av --exclude="data" --exclude=".git" --exclude=".github" --exclude=".vscode" --exclude="node_modules" ./ "$NEW_REPO_PATH"

# Navigate to the new repository directory
cd "$NEW_REPO_PATH"

# Remove any .git directories that might have been copied (just in case)
rm -rf .git

# Initialize a new Git repository
git init

# Rename the main branch to "main"
git branch -m main

# Add all files to the new repository
git add .

# Commit the files
git commit -m "Public version"

# Add the new remote origin
git remote add origin "$NEW_REPO_URL"

# Push to the public repository
git push -uf origin main

# Clean up the temporary directory
cd -
rm -rf "$NEW_REPO_PATH"

echo "Repository published to $NEW_REPO_URL"

