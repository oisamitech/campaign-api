#!/bin/bash

set -euo pipefail

for file in "${CI_ENVIRONMENT}"/*
do
  if [ -f "$file" ]; then
    sed -i "s/%GOOGLE_PROJECT_ID%/${GOOGLE_PROJECT_ID}/g" "$file"
    sed -i "s/%CONTAINER_REPLICAS%/${CONTAINER_REPLICAS}/g" "$file"
    sed -i "s/%CIRCLE_PROJECT_REPONAME%/${CIRCLE_PROJECT_REPONAME}/g" "$file"
  fi
done