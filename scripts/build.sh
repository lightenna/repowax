#!/usr/bin/env bash
# change into the repo root directory, if not there already
cwd="$(dirname $(readlink -f "$0"))"
cd $cwd/../

echo "Build container image"
DOCKER_REPO="repowax"
DOCKER_ACC="lightenna"
IMG_TAG=$(jq --raw-output '.version' ./microservices/repowax/package.json)
docker build --build-arg USER_ID=21001 --build-arg GROUP_ID=22002 --tag $DOCKER_ACC/$DOCKER_REPO:$IMG_TAG --tag $DOCKER_ACC/$DOCKER_REPO:latest .

echo "Push to ACR"
docker push $DOCKER_ACC/$DOCKER_REPO:$IMG_TAG
docker push $DOCKER_ACC/$DOCKER_REPO:latest

echo "Clean up old images"
docker rmi --force $(docker images --filter "dangling=true" -q --no-trunc)
