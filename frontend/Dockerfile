FROM node:10.15.3-stretch

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
