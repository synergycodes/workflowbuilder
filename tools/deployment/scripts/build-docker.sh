#!/bin/sh
# Build + push the AI Studio images to ACR, mirroring the workflow-builder
# repo's tools/deployment/scripts/build-docker.sh. All three images come from
# the same multi-target Dockerfile in deploy/ai-studio/ — this script only
# adds registry tagging; the images are identical to the local-compose ones.
#
# Bitbucket-style env vars are honored when present (TAG_PREFIX,
# BITBUCKET_COMMIT, BITBUCKET_DEPLOYMENT_ENVIRONMENT) and fall back to git +
# DEPLOY_ENV so the script also runs from a workstation or GitHub Actions.
set -eu

APP_NAME="ai-studio"
REGISTRY="${REGISTRY:-synergycodes.azurecr.io}"
COMMIT="${BITBUCKET_COMMIT:-$(git rev-parse HEAD)}"
ENVIRONMENT="${BITBUCKET_DEPLOYMENT_ENVIRONMENT:-${DEPLOY_ENV:-}}"
export IMAGE_TAG="${TAG_PREFIX:-}$COMMIT"

for TARGET in runtime migrate web; do
  TAG="$REGISTRY/$APP_NAME:$TARGET-$IMAGE_TAG"
  docker build \
    -f ./deploy/ai-studio/Dockerfile \
    --target "$TARGET" \
    -t "$TAG" \
    .
done

ALLOWED_ENVIRONMENTS="stage dev prod"

if echo "$ALLOWED_ENVIRONMENTS" | grep -w "$ENVIRONMENT" > /dev/null; then
  # setup-az.sh exists in the deployment CI image; logging in by other means
  # (az acr login / docker login) is fine when running elsewhere
  [ -f /var/setup-az.sh ] && . /var/setup-az.sh
  for TARGET in runtime migrate web; do
    docker push "$REGISTRY/$APP_NAME:$TARGET-$IMAGE_TAG"
  done
else
  echo "Environment '$ENVIRONMENT' is not configured for image push. Skipping."
fi
