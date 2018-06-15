FROM node:6.11.0

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
