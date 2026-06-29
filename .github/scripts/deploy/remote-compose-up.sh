#!/usr/bin/env sh
set -eu

fail() {
  echo "Deployment error: $*" >&2
  exit 1
}

require_env() {
  name="$1"
  eval "value=\${$name:-}"
  [ -n "$value" ] || fail "$name is required."
}

require_env DEPLOY_PATH
require_env DEPLOYMENT_NAME
require_env INCOMING_DIR
require_env GHCR_USER
require_env GHCR_TOKEN

case "$DEPLOY_PATH" in
  ""|"/") fail "DEPLOY_PATH must not be empty or /." ;;
  /*) ;;
  *) fail "DEPLOY_PATH must be absolute." ;;
esac

case "$DEPLOYMENT_NAME" in
  *[!A-Za-z0-9_.-]*|"") fail "DEPLOYMENT_NAME contains unsupported characters." ;;
  *) ;;
esac

[ -d "$INCOMING_DIR" ] || fail "Incoming deployment bundle was not found: $INCOMING_DIR"
[ -f "$INCOMING_DIR/compose.yml" ] || fail "Bundle is missing compose.yml."
[ -f "$INCOMING_DIR/client/nginx.conf" ] || fail "Bundle is missing client/nginx.conf."

docker_cmd() {
  if docker version >/dev/null 2>&1; then
    docker "$@"
  elif command -v sudo >/dev/null 2>&1 && sudo -n docker version >/dev/null 2>&1; then
    sudo docker "$@"
  else
    fail "Docker must be installed and available to the deployment user."
  fi
}

docker_cmd compose version >/dev/null 2>&1 || fail "Docker Compose plugin is required."

deploy_root="${DEPLOY_PATH%/}"
app_dir="$deploy_root/app"
shared_dir="$deploy_root/shared"
shared_server_env="$shared_dir/server.env.docker"
shared_compose_env="$shared_dir/compose.env"

mkdir -p "$app_dir/server" "$app_dir/client" "$app_dir/deploy" "$shared_dir"

if [ -f "$shared_server_env" ]; then
  cp "$shared_server_env" "$app_dir/server/.env.docker"
elif [ -f "$app_dir/server/.env.docker" ]; then
  cp "$app_dir/server/.env.docker" "$shared_server_env"
else
  fail "Create $shared_server_env before deploying."
fi

if [ -f "$shared_compose_env" ]; then
  cp "$shared_compose_env" "$app_dir/.env"
elif [ -f "$app_dir/.env" ]; then
  cp "$app_dir/.env" "$shared_compose_env"
else
  fail "Create $shared_compose_env before deploying."
fi

cp "$INCOMING_DIR/compose.yml" "$app_dir/compose.yml"
cp "$INCOMING_DIR/client/nginx.conf" "$app_dir/client/nginx.conf"
if [ -f "$INCOMING_DIR/manifest.yaml" ]; then
  cp "$INCOMING_DIR/manifest.yaml" "$app_dir/deploy/manifest.yaml"
fi

compose_cmd() {
  docker_cmd compose \
    --env-file "$app_dir/.env" \
    --project-name "$DEPLOYMENT_NAME" \
    --project-directory "$app_dir" \
    -f "$app_dir/compose.yml" \
    "$@"
}

printf '%s' "$GHCR_TOKEN" | docker_cmd login ghcr.io -u "$GHCR_USER" --password-stdin
compose_cmd config --quiet
compose_cmd pull

if compose_cmd up --help | grep -q -- '--wait'; then
  compose_cmd up -d --wait --remove-orphans
else
  compose_cmd up -d --remove-orphans
fi

compose_cmd ps
rm -rf "$INCOMING_DIR"
echo "Deployment ${MANIFEST_VERSION:-latest} finished in $app_dir."
