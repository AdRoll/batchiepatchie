FROM node:10.16.3-buster

# AWS cli tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python \
    python-dev \
    python-pip
RUN pip install PyYAML==5.3.1
RUN pip install awscli

# Copy and install frontend requirements
COPY . /opt/frontend
WORKDIR /opt/frontend
RUN yarn
