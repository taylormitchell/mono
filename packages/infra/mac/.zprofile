eval "$(/opt/homebrew/bin/brew shellenv)"
export PROMPT="%1~ %# "
source ~/.env

# git helpers
source ~/Code/mono/packages/infra/mac/git-helpers.sh

# Create and open
o() {
  touch $1
  open $1
}

alias x="clear"
alias kb="bun $HOME/Code/mono/packages/kb/cli/index.ts"
alias log="bun $HOME/Code/mono/scripts/2025-03-30-log-cli.ts"
alias code="cursor"
alias cal="bun --env-file $HOME/Code/mono/packages/gcal-cli/.env $HOME/Code/mono/packages/gcal-cli/index.ts"

# mono-cli
cli_path="$HOME/Code/mono/packages/mono-cli/index.ts"
my() {
  if [ "$1" = "cd" ]; then
    if [ -z "$2" ]; then
      cd $(bun $cli_path root)
    else
      cd $(bun $cli_path path $2)
    fi
  elif [ "$1" = "root" ]; then
    cd $(bun $cli_path root)
  elif [ "$1" = "script" ]; then
    if [ "$TERM_PROGRAM" = "vscode" ]; then
      code $(bun $cli_path script $2)
    else
      vim $(bun $cli_path script $2)
    fi
  elif [ "$1" = "note" ]; then
    local note_path=$(bun $cli_path note ${@:2})
    if [[ "$*" =~ " -m " ]]; then
      echo $note_path
    else
      if [ "$TERM_PROGRAM" = "vscode" ]; then
        code $note_path
      else
        vim $note_path
      fi
    fi
  else
    bun $cli_path "$@"
  fi
}






