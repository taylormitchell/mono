#!/bin/bash

if [ $# -eq 0 ]; then
  echo "Usage: $0 <markdown-file>"
  exit 1
fi

input_file="$1"
filename="${input_file%.*}"

pandoc "$input_file" \
    -o "$filename.pdf" \
    --pdf-engine=wkhtmltopdf \
    --css=cover-letter-styles.css \
    -V margin-left=1in \
    -V margin-right=1in \
    -V margin-top=1in \
    -V papersize=letter \
    --standalone
