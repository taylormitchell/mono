#!/usr/bin/env bash
# Main entry point script for the 'my' CLI
# This script handles shell-specific operations and delegates to TypeScript code

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
TS_SCRIPT="$SCRIPT_DIR/src/index.ts"

# Function to get preferred editor
get_editor() {
  if [ "$TERM_PROGRAM" = "vscode" ] || [ -n "$VSCODE_IPC_HOOK" ]; then
    echo "code"
  elif command -v cursor &> /dev/null; then
    echo "cursor"
  else
    echo "vim"
  fi
}

# Handle shell-specific commands
case "$1" in
  "cd")
    # Change directory command
    if [ -z "$2" ]; then
      # No argument provided, cd to mono root
      cd "$(bun "$TS_SCRIPT" cd)" || exit 1
    else
      # Resolve the directory path and cd to it
      cd "$(bun "$TS_SCRIPT" cd "$2")"
    fi
    ;;
    
  "script")
    if [ -z "$2" ]; then
      # No script type provided, show error and exit
      echo "Error: Script type required (e.g., js, sh, py)"
      exit 1
    fi
    
    # Create script file and open in editor
    SCRIPT_PATH=$(bun "$TS_SCRIPT" script "$2")
    if [ -n "$SCRIPT_PATH" ]; then
      EDITOR=$(get_editor)
      "$EDITOR" "$SCRIPT_PATH"
    else
      exit 1
    fi
    ;;
    
  "note")
    if [ "$2" = "create" ]; then
      # Check for -m flag
      if [[ "$*" =~ " -m " ]]; then
        # Just output the note path
        bun "$TS_SCRIPT" note create "${@:3}"
      else
        # Create note and open in editor
        NOTE_PATH=$(bun "$TS_SCRIPT" note create "${@:3}")
        if [ -n "$NOTE_PATH" ]; then
          EDITOR=$(get_editor)
          "$EDITOR" "$NOTE_PATH"
        fi
      fi
    else
      # For other note commands, pass through to TS script
      bun "$TS_SCRIPT" note "${@:2}"
    fi
    ;;
    
  *)
    # For all other commands, pass through to TS script
    bun "$TS_SCRIPT" "$@"
    ;;
esac