#!/usr/bin/env bash

# Get the absolute path to this package directory
MY_CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"

# Get the shell type
shell_rc="$HOME/.${SHELL##*/}rc"

BEGIN="# >>> my‑cli >>>"
END="# <<< my‑cli <<<"
if ! grep -q "$BEGIN" "$shell_rc"; then
  cat >>"$shell_rc" <<EOF
$BEGIN
MY_CLI_DIR="$MY_CLI_DIR"
[ -f "\$MY_CLI_DIR/index.sh" ] && source "\$MY_CLI_DIR/index.sh"
alias my="_my"
$END
EOF
fi

# Verify Bun is installed
if ! command -v bun &> /dev/null; then
  echo "⚠️ Bun is required but not installed. Please install it with:"
  echo "    curl -fsSL https://bun.sh/install | bash"
fi

echo "Installation complete!"
echo "You can use the CLI with: my <command>"