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
alias cal="bun --env-file $HOME/Code/mono/packages/gcal-cli/.env $HOME/Code/mono/packages/gcal-cli/index.ts"
