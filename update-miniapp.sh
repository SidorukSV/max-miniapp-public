git pull
touch .env
grep -v -E "^(GIT_COMMIT|BUILD_TIME|APP_VERSION|BACKEND_VERSION)=" .env > .env.tmp || true
mv .env.tmp .env
COMMIT=$(git rev-parse --short HEAD)
cat >> .env <<EOF
GIT_COMMIT=${COMMIT}
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
APP_VERSION=${COMMIT}
BACKEND_VERSION=${COMMIT}
EOF