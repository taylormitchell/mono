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