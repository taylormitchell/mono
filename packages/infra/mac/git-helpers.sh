#!/bin/bash
# Git Helper Functions

# Alias for quickly committing all changes as "wip"
alias gwip="git add --all && git commit -m \"wip\""

# Alias for quickly committing all changes as "clean up"
alias gcleanup="git add --all && git commit -m \"clean up\""

# Function to save all current changes with an optional commit message
# Usage: gsave [commit_message]
# If no commit message is provided, "save" will be used
function gsave() {
  echo "Checking for changes to save..."
  git_status=$(git status --porcelain)
  if [ -n "$git_status" ]; then
    git add --all
    if [ $? -ne 0 ]; then
      echo "ERROR: Failed to stage changes"
      return 1
    fi
    
    if [ -z "$1" ]; then
      echo "Committing all changes with message: save"
      git commit -m "save" || {
        echo "ERROR: Failed to commit changes"
        return 1
      }
    else
      echo "Committing all changes with message: $1"
      git commit -m "$1" || {
        echo "ERROR: Failed to commit changes"
        return 1
      }
    fi
    echo "Changes saved successfully"
  else
    echo "No changes to commit"
  fi
}

# Syncs the current branch with the remote branch
# On conflict, it will keep the local changes
# Usage: gsync [branch_name]
# If no branch name is provided, the current branch will be used
function gsync() {
  # Get current branch or use provided branch
  local branch=${1:-$(git branch --show-current)}
  
  if [ -z "$branch" ]; then
    echo "ERROR: Could not determine branch name"
    return 1
  fi
  
  # Check if we're on a detached HEAD
  if [[ "$branch" == "HEAD" ]]; then
    echo "ERROR: Currently in detached HEAD state. Cannot sync."
    return 1
  fi
  
  echo "Syncing branch: $branch"
  
  # Save current changes
  gsave || {
    echo "WARNING: Could not save changes, but continuing with sync"
  }
  
  # Fetch from remote
  echo "Fetching from remote..."
  git fetch origin $branch
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to fetch from remote. Check your connection or remote repository."
    return 1
  fi
  
  # Check if remote branch exists
  git rev-parse --verify origin/$branch &>/dev/null
  if [ $? -ne 0 ]; then
    echo "ERROR: Remote branch origin/$branch does not exist"
    return 1
  fi
  
  # Merge remote changes, keeping our changes on conflict
  echo "Merging remote changes (keeping local changes on conflict)..."
  git merge origin/$branch -X ours -m "merge origin/$branch, keeping our changes"
  if [ $? -ne 0 ]; then
    echo "ERROR: Merge failed. You may need to resolve conflicts manually."
    return 1
  fi
  
  # Push changes back to remote
  echo "Pushing changes to remote..."
  git push origin $branch
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to push changes to remote"
    return 1
  fi
  
  echo "Sync completed successfully for branch: $branch"
}
