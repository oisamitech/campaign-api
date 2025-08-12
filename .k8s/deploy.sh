#!/bin/bash

set -euo pipefail

if grep -q "${CIRCLE_PROJECT_REPONAME}" <<< "$(kubectl get deployments)"; then
  if (git diff-tree --no-commit-id --name-only -r "${GIT_BASE_REVISION}".."${GIT_REVISION}") >/dev/null 2>&1; then
    echo "Submitting configmap.yaml" && kubectl apply -f "${PWD}/$CI_ENVIRONMENT/configmap.yaml"
    echo "Submitting secret.yaml" && kubectl apply -f "${PWD}/$CI_ENVIRONMENT/secret.yaml"

    while read -r line; do
      if [[ "$line" =~ .k8s/"${CI_ENVIRONMENT}" ]]; then
        echo "Submitting changed file: ${line}"
        kubectl apply -f "$(dirname "${PWD}")/$line"
      fi
    done < <(git diff-tree --no-commit-id --name-only -r "${GIT_BASE_REVISION}".."${GIT_REVISION}")
  else
    echo "Invalid revision range detected, submitting all files."
    kubectl apply -f "${CI_ENVIRONMENT}"/
  fi
else
  echo "It's the first deploy, submitting all files."
  kubectl apply -f "${CI_ENVIRONMENT}"/
fi

kubectl set image deployment "${CIRCLE_PROJECT_REPONAME}"-deploy "${CIRCLE_PROJECT_REPONAME}"-init=gcr.io/"${GOOGLE_PROJECT_ID}"/"${CIRCLE_PROJECT_REPONAME}":"${CIRCLE_SHA1}"

kubectl set image deployment "${CIRCLE_PROJECT_REPONAME}"-deploy "${CIRCLE_PROJECT_REPONAME}"=gcr.io/"${GOOGLE_PROJECT_ID}"/"${CIRCLE_PROJECT_REPONAME}":"${CIRCLE_SHA1}"