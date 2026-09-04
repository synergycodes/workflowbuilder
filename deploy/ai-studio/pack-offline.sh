#!/usr/bin/env bash
# Builds the images and packs the air-gap bundle into one directory: the image
# tarball, its sha256, an inspect manifest, and the files the host needs to run
# compose. Run on a connected machine — README "Air-gapped / offline install".
set -euo pipefail
cd "$(dirname "$0")"

out=${1:-ai-studio-offline}
mkdir -p "$out/tls"

docker compose build
docker compose --profile debug pull --ignore-buildable

images=()
while IFS= read -r ref; do images+=("$ref"); done < <(docker compose --profile debug config --images | sort -u)

docker save -o "$out/ai-studio-images.tar" "${images[@]}"
(cd "$out" && shasum -a 256 ai-studio-images.tar > ai-studio-images.tar.sha256)
docker image inspect "${images[@]}" \
  --format '{{join .RepoTags " "}}	{{join .RepoDigests " "}}	{{.Id}}	{{.Os}}/{{.Architecture}}' \
  > "$out/ai-studio-images.manifest.txt"
cp .env.example docker-compose.yml docker-compose.override.yml "$out/"

echo "Bundle written to $out:"
ls -la "$out"
