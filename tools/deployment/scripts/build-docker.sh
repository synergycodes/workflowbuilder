#!/bin/sh
# Build + push the AI Studio images (deploy/ai-studio/Dockerfile) to ACR,
# mirroring workflow-builder's build-docker.sh. Bitbucket CI vars win when
# present; git/DEPLOY_ENV fallbacks keep it runnable from a workstation.
set -eu

APP_NAME="ai-studio"
REGISTRY="${REGISTRY:-synergycodes.azurecr.io}"
COMMIT="${BITBUCKET_COMMIT:-$(git rev-parse HEAD)}"
ENVIRONMENT="${BITBUCKET_DEPLOYMENT_ENVIRONMENT:-${DEPLOY_ENV:-}}"
export IMAGE_TAG="${TAG_PREFIX:-}$COMMIT"

for TARGET in runtime web; do
  TAG="$REGISTRY/$APP_NAME:$TARGET-$IMAGE_TAG"
  docker build \
    -f ./deploy/ai-studio/Dockerfile \
    --target "$TARGET" \
    -t "$TAG" \
    .
done

ALLOWED_ENVIRONMENTS="stage dev prod"

if echo "$ALLOWED_ENVIRONMENTS" | grep -w "$ENVIRONMENT" > /dev/null; then
  # setup-az.sh only exists in the deployment CI image
  [ -f /var/setup-az.sh ] && . /var/setup-az.sh
  for TARGET in runtime web; do
    docker push "$REGISTRY/$APP_NAME:$TARGET-$IMAGE_TAG"
  done
else
  echo "Environment '$ENVIRONMENT' is not configured for image push. Skipping."
fi
