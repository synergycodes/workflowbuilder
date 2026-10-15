#!/usr/bin/env bash
# Builds the images and packs the air-gap bundle into one directory: the image
# tarball, its sha256, an inspect manifest, and the files the host needs to run
# compose. Run on a connected machine — README "Air-gapped / offline install".
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)

# Resolved before the cd below, so a relative path means relative to the caller.
# The checkout is the image build context: a bundle inside it would be copied
# into the next build, so it is refused.
out=${1:-$HOME/ai-studio-offline}
mkdir -p "$out/tls"
out=$(cd "$out" && pwd)
case "$out/" in
  "$repo"/*)
    rmdir "$out/tls" "$out" 2>/dev/null || true
    echo "pack-offline: $out is inside the checkout ($repo); choose a directory outside it" >&2
    exit 1
    ;;
esac

cd "$here"

# A developer's ./.env or exported shell variables (Temporal Cloud, registry image
# names, COMPOSE_FILE) would shape the bundle; the host gets .env.example defaults,
# so build from those: skip the file and drop every variable the compose files read.
unset COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PATH_SEPARATOR
for name in $(grep -oh '\${[A-Za-z_][A-Za-z0-9_]*' docker-compose.yml docker-compose.override.yml | tr -d '${' | sort -u); do
  unset "$name"
done
compose() { docker compose --env-file /dev/null "$@"; }
[ -f .env ] && echo "pack-offline: ignoring ./.env — the bundle is built from .env.example defaults" >&2

compose build --pull
compose --profile debug pull --ignore-buildable

images=()
while IFS= read -r ref; do images+=("$ref"); done < <(compose --profile debug config --images | sort -u)

docker save -o "$out/ai-studio-images.tar" "${images[@]}"
(cd "$out" && shasum -a 256 ai-studio-images.tar > ai-studio-images.tar.sha256)
docker image inspect "${images[@]}" \
  --format '{{join .RepoTags " "}}	{{join .RepoDigests " "}}	{{.Id}}	{{.Os}}/{{.Architecture}}' \
  > "$out/ai-studio-images.manifest.txt"
cp .env.example docker-compose.yml docker-compose.override.yml "$out/"

echo "Bundle written to $out:"
ls -la "$out"
