#!/bin/bash
# Infrastructure Deployment Script
# This script installs and configures system components like crontab and shell profiles

# Make scripts executable
echo "Making scripts executable..."
chmod +x "$(dirname "$0")"/*.sh || {
  echo "ERROR: Failed to make scripts executable"
  exit 1
}

# Update crontab
echo "Updating crontab..."
crontab "$(dirname "$0")/crontab" || {
  echo "ERROR: Failed to update crontab"
  exit 1
}
echo "Crontab updated successfully"

# Update .zprofile
echo "Updating .zprofile..."
if [ -L "$HOME/.zprofile" ]; then
  rm "$HOME/.zprofile" || {
    echo "ERROR: Failed to remove existing .zprofile symlink"
    exit 1
  }
fi
echo "Creating new .zprofile symlink"
ln -s "$(pwd)/.zprofile" "$HOME/.zprofile" || {
  echo "ERROR: Failed to create .zprofile symlink"
  exit 1
}
source "$HOME/.zprofile" || echo "WARNING: Failed to source .zprofile, please restart your shell"

# Update .vimrc
echo "Updating .vimrc..."
if [ -L "$HOME/.vimrc" ]; then
  rm "$HOME/.vimrc" || {
    echo "ERROR: Failed to remove existing .vimrc symlink"
    exit 1
  }
fi
echo "Creating new .vimrc symlink"
ln -s "$(pwd)/.vimrc" "$HOME/.vimrc" || {
  echo "ERROR: Failed to create .vimrc symlink"
  exit 1
}

echo "Deployment completed successfully"

