#!/bin/bash

parse_date () {
  git log -1 --pretty=format:'%ad' --date=short "$1"
}

create_tag () {
  git tag "$1"
}

get_package_version () {
  awk -F\" '/"version":/ {print $4}' ../package.json
}

if [[ -z $(git tag | tail -1) ]]; then
  first_tag="$(get_package_version)"

  create_tag "$first_tag"

  tag_date=$(parse_date "${first_tag}")

  printf "# CHANGELOG\n\n"
  printf "## %s (%s)\n\n" "$first_tag" "$tag_date"

  git log --pretty=format:"* %s by %an [View](https://github.com/oisamitech/${CIRCLE_PROJECT_REPONAME}/commit/%H)" --reverse | grep -v 'Merge\|skip]'

  printf "\n\n"
else
  previous_tag=0

  first_tag=$(git tag | head -1)

  create_tag "$(get_package_version)"

  printf "# CHANGELOG\n\n"

  for current_tag in $(git tag --sort=-creatordate)
  do
    if [ "$previous_tag" != 0 ]; then
      printf "## %s (%s)\n\n" "$previous_tag" "$(parse_date "${previous_tag}")"

      git log "${current_tag}"..."${previous_tag}" --pretty=format:"* %s by %an [View](https://github.com/oisamitech/${CIRCLE_PROJECT_REPONAME}/commit/%H)" --reverse | grep -v 'Merge\|skip]'

      printf "\n\n"
    fi
    previous_tag=${current_tag}
  done

  printf "## %s (%s)\n\n" "$first_tag" "$(parse_date "${first_tag}")"

  git log "${first_tag}" --pretty=format:"* %s by %an [View](https://github.com/oisamitech/${CIRCLE_PROJECT_REPONAME}/commit/%H)" --reverse | grep -v 'Merge\|skip]'
fi