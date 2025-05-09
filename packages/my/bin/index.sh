# Main entry point script for the 'my' CLI
# This script handles shell-specific operations and delegates to TypeScript code

# To use this script for development, source it in your shell:
# source ./index.sh
# Then use the 'my' command

SCRIPT_DIR=$0
PROJECT_ROOT="$(cd "$(dirname "$SCRIPT_DIR")/.." >/dev/null && pwd)"
TS_SCRIPT="$PROJECT_ROOT/src/cli/index.ts"

# Function to get preferred editor
get_editor() {
  if [ "$TERM_PROGRAM" = "vscode" ]; then
    echo "code"
  else
    echo "vim"
  fi
}

_my() {
  local command="$1"
  
  case "$command" in
    "cd")
      # Resolve the directory path and cd to it
      local path=$(bun "$TS_SCRIPT" cd "$2")
      if [ -n "$path" ]; then
        cd "$path"
      else
        return 1
      fi
      ;;
      
    "script")
      if [ -z "$2" ]; then
        # No script type provided, show error and exit
        echo "Error: Script type required (e.g., js, sh, py)"
        return 1
      fi
      
      # Create script file and open in editor
      local SCRIPT_PATH=$(bun "$TS_SCRIPT" script "$2")
      if [ -n "$SCRIPT_PATH" ]; then
        local EDITOR=$(get_editor)
        "$EDITOR" "$SCRIPT_PATH"
      else
        return 1
      fi
      ;;
      
    "note")
        local RESULT=$(bun "$TS_SCRIPT" note "${@:2}")
        
        # Parse the result to get file path and whether to open
        local IFS=":"
        read -r NOTE_PATH SHOULD_OPEN <<< "$RESULT"
        
        echo $NOTE_PATH
        
        # Open the file if the TypeScript code indicated we should
        if [ "$SHOULD_OPEN" = "true" ]; then
          if [ -n "$NOTE_PATH" ]; then
            local EDITOR=$(get_editor)
            "$EDITOR" "$NOTE_PATH"
          fi
        fi
      ;;
      
    *)
      # For all other commands, pass through to TS script
      bun "$TS_SCRIPT" "$@"
      ;;
  esac
}

# If the script is being executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Direct execution - just print instructions
  echo "This script needs to be sourced to enable the 'cd' command functionality."
  echo ""
  echo "To use during development:"
  echo "  source $(basename "$0")"
  echo "  _my <command> [args]"
  echo ""
  echo "Examples:"
  echo "  _my cd mono    # Changes to the mono directory"
  echo "  _my script js  # Creates and opens a JavaScript script"
  echo ""
  exit 0
fi
