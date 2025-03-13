eval "$(/opt/homebrew/bin/brew shellenv)"
export PROMPT="%1~ %# "

# git helpers
source ~/Code/mono/packages/infra/mac/git-helpers.sh

# Create vite app with tailwind set up
my-create-vite() {
    local app_name=${1:-.}
    npm create vite@latest $app_name -- \
        --template react-ts && \
    cd $app_name && \
    npm install -D tailwindcss postcss autoprefixer && \
    npx tailwindcss init -p && \
    echo 'module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}' > tailwind.config.js && \
    echo '@tailwind base;
@tailwind components;
@tailwind utilities;' > src/index.css
}

# Create and open
o() {
  touch $1
  open $1
}

# taylor's tech
alias t="bun /Users/taylormitchell/Code/mono/packages/todo-cli/cli.ts"
alias n="bun /Users/taylormitchell/Code/mono/packages/note-cli/cli.ts"
alias gkb="bun /Users/taylormitchell/Code/mono/packages/git-knowledge-base/cli/index.ts"
alias x="clear"
export mono="/Users/taylormitchell/Code/mono"
export notes="/Users/taylormitchell/Code/notes/notes"



