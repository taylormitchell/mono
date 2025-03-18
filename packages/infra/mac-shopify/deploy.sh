#!/bin/bash

# Make scripts executable
echo "Making scripts executable..."
chmod +x "$(dirname "$0")"/*.sh || {
  echo "ERROR: Failed to make scripts executable"
  exit 1
}

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

echo "Deployment completed successfully"

