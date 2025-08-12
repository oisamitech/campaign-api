#!/bin/bash

changes=0

while read -r _status filename; do
  (( changes++ )) || true
  if [[ "$filename" =~ package.json ]]; then
    git add ../package*
    git commit -m "[ci skip]: bump version"
  else
    git add ../CHANGELOG.md
    git commit -m "[ci skip]: generated changelog"
  fi
done < <(git status --porcelain)
if (( ! changes )); then
  echo "No changes."
else
  git push origin HEAD
fi