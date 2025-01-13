eval "$(/opt/homebrew/bin/brew shellenv)"
export PROMPT="%1~ %# "

# git helpers
alias gwip="git add --all && git commit -m \"wip\""
alias gcleanup="git add --all && git commit -m \"clean up\""
function gsave() {
  git_status=$(git status --porcelain)
  if [ -n "$git_status" ]; then
    git add --all
    if [ -z "$1" ]; then
      echo "committing all"
      git commit -m "save" || true
    else
      echo "committing all with message: $1"
      git commit -m "$1" || true
    fi
  else
    echo "no changes to commit"
  fi
}
function gsync() {
  echo "pulling"
  git pull
  gsave
  echo "pushing"
  git push
}

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
alias t="bun /Users/taylormitchell/Code/home/packages/todo-cli/cli.ts"
alias n="bun /Users/taylormitchell/Code/home/packages/note-cli/cli.ts"
alias x="clear"
export home="/Users/taylormitchell/Code/home"
export notes="/Users/taylormitchell/Code/home/notes"



