export PROMPT="%1~ %# "

# git helpers
source ~/Code/mono/packages/infra/mac/git-helpers.sh

# Create and open
o() {
  touch $1
  open $1
}

# taylor's tech
alias t="bun $HOME/Code/mono/packages/todo-cli/cli.ts"
alias n="bun $HOME/Code/mono/packages/note-cli/cli.ts"
alias gkb="bun $HOME/Code/mono/packages/git-knowledge-base/cli/index.ts"
alias x="clear"
export mono="$HOME/Code/mono"
export notes="$HOME/Code/notes/notes"

