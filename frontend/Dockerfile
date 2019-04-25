FROM node:10.15.3-stretch

# This is a fix for the underlying docker image (node:6.11.0).
# It is based on an old version of debian and the sources have changed
# I'm partially following the advise here: https://unix.stackexchange.com/questions/508724/failed-to-fetch-jessie-backports-repository
RUN echo deb http://archive.debian.org/debian jessie main > /etc/apt/sources.list
RUN echo deb http://security.debian.org jessie/updates main >> /etc/apt/sources.list

# AWS cli tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python \
    python-dev \
    python-pip
RUN pip install awscli

# Copy and install frontend requirements
COPY . /opt/frontend
WORKDIR /opt/frontend
RUN yarn
