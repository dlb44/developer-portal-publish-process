#!/bin/bash
set -eux

echo "Building Docker image"
imageName=$HANDEL_PIPELINE_NAME-app
docker build -t "$imageName:latest" .

arrEnvs=(${ENV_TO_DEPLOY//,/ })
for env in "${arrEnvs[@]}"; do
  echo "Tagging and pushing Docker image for environment $env"
  ecrImage="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$imageName:$env"
  docker tag "$imageName:latest" "$ecrImage"
  docker push "$ecrImage"
done