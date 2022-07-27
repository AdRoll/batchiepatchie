#!/bin/bash

set -euxo pipefail

# This script is the entry point for the Go Reporting application when
# running inside the docker container.

# https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# This dance let's the Docker image create directories when run locally with
# docker-compose.
USER_ID=${LOCAL_USER_ID:-501}
useradd --shell /bin/bash -u $USER_ID -o -c "" -m user || true
export HOME=/home/user

OWNER=`ls -ld . | awk '{print $3}'`
ME=`whoami`

CHANGE_TO=user
# Don't change our identity if the current files are owned by us already.
if [ "${OWNER}" = "${ME}" ]; then
   echo "I will not change my user because my files are already owned by me."
   CHANGE_TO="${ME}"
fi;

exec gosu ${CHANGE_TO} bash <<"EOF"
set -euxo pipefail
export VERSION=`cat version`

# Get local IP address; or just assume it is 127.0.0.1
BATCHIEPATCHIE_IP=$(curl http://instance-data/latest/meta-data/local-ipv4) || BATCHIEPATCHIE_IP=127.0.0.1
export BATCHIEPATCHIE_IP

BUILD_ENV_ENV=${BUILD_ENV:-}

if [ "${BUILD_ENV_ENV}" = "DEBUG" ]; then
    # Runs the Delve debugger in headless mode.
    dlv debug --headless=true --listen=:9999 --accept-multiclient=true --api-version=1
fi;

if [ "${BUILD_ENV_ENV}" = "PRODUCTION" ]; then
    sleep 5
    go build -buildvcs=false
    ./batchiepatchie
else
    sleep 5
    # Runs the application through Fresh for code reloading.
    fresh -c fresh.conf
fi;
EOF
