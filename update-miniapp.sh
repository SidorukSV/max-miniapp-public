#!/usr/bin/env sh

set -eu

read_package_version() {
  awk -F'"' '/^[[:space:]]*"version"[[:space:]]*:/ { print $4; exit }' "$1"
}

git pull --ff-only
touch .env
grep -v -E "^(GIT_COMMIT|BUILD_TIME|APP_VERSION|BACKEND_VERSION)=" .env > .env.tmp || true
mv .env.tmp .env
COMMIT=$(git rev-parse --short HEAD)
FRONTEND_VERSION=$(read_package_version frontend/package.json)
BACKEND_VERSION=$(read_package_version backend/package.json)

if [ -z "$FRONTEND_VERSION" ] || [ -z "$BACKEND_VERSION" ]; then
  echo "Unable to read component versions from package.json" >&2
  exit 1
fi

cat >> .env <<EOF
GIT_COMMIT=${COMMIT}
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
APP_VERSION=${FRONTEND_VERSION}
BACKEND_VERSION=${BACKEND_VERSION}
EOF
