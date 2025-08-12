#!/bin/bash

if [[ -z $(git describe --tags --abbrev=0) ]]; then
  echo "First release, unnecessary patch."
else
  commit=$(git show --format=%b -s)

  case "$commit" in
    *major*) npm --no-git-tag-version version major ;;
    *minor*) npm --no-git-tag-version version minor ;;
    *)       npm --no-git-tag-version version patch ;;
  esac
fi