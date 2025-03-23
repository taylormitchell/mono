eval "$(/opt/homebrew/bin/brew shellenv)"
export PROMPT="%1~ %# "

# git helpers
source ~/Code/mono/packages/infra/mac/git-helpers.sh

# Create and open
o() {
  touch $1
  open $1
}

# taylor's tech
alias x="clear"
alias mono="bun $HOME/Code/mono/packages/mono-cli/index.ts"
alias kb="bun $HOME/Code/mono/packages/kb/cli/index.ts"



