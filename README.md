

find . -maxdepth 1 -type f -name "*.md" -print0 | xargs -0 -I {} sh -c 'echo "\n--- {} ---\n"; cat "{}"; echo "\n"' | less

find . -maxdepth 1 -type f -name "*.md" -printf "%T@ %p\0" | sort -zrn | cut -zf2- | xargs -0 -I {} sh -c 'echo "\n--- {} ---\n"; cat "{}"; echo "\n"' | less