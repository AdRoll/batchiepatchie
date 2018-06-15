#!/usr/bin/env bash
set -euxo pipefail

# Set FRONTEND_S3_PREFIX before running this script. It determines where in S3
# you want to put your static files.

cd "$(dirname "$0")"
npm run build:dist
aws s3 sync --acl public-read /opt/frontend/dist ${FRONTEND_S3_PREFIX}/$VERSION
