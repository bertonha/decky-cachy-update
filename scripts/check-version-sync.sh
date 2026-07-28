#!/usr/bin/env bash
# package.json is the release source of truth; pyproject.toml carries the same
# version for the backend and has to be bumped alongside it.
set -euo pipefail

cd "$(dirname "$0")/.."

npm_version=$(node -p "require('./package.json').version")
py_version=$(sed -n 's/^version = "\(.*\)"$/\1/p' pyproject.toml | head -1)

if [ "$npm_version" != "$py_version" ]; then
  echo "version mismatch: package.json is $npm_version, pyproject.toml is $py_version" >&2
  exit 1
fi
