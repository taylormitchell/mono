export PROMPT="%1~ %# "

# git helpers
source ~/Code/mono/packages/infra/mac/git-helpers.sh

# Create and open
o() {
  touch $1
  open $1
}

# taylor's tech
alias mono="bun $HOME/Code/mono/packages/mono-cli/index.ts"
alias kb="bun $HOME/Code/mono/packages/kb/cli/index.ts"
alias x="clear"
alias ankify="bundle exec $HOME/Code/ankify/bin/ankify"
alias ai="bun $HOME/Code/mono/packages/ai/cli-helper.ts"
alias log="bun $HOME/Code/mono/scripts/2025-03-30-log-cli.ts"
alias cal="bun $HOME/Code/mono/packages/gcal-cli/src/index.ts"
alias gsw="git switch -"
alias gs="git status"

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






