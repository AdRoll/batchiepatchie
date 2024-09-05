FROM golang:1.21

RUN mkdir -p /go/src/github.com/AdRoll/batchiepatchie
WORKDIR /go/src/github.com/AdRoll/batchiepatchie
COPY . /go/src/github.com/AdRoll/batchiepatchie

RUN go mod download -x

EXPOSE 5454
EXPOSE 9999

RUN go install github.com/pilu/fresh@latest
RUN go install github.com/go-delve/delve/cmd/dlv@latest
RUN wget https://github.com/pressly/goose/releases/download/v2.6.0/goose-linux64 -O /usr/bin/goose
# RUN go get -u github.com/pressly/goose/cmd/goose
RUN set -eux; \
	apt-get update; \
	apt-get install -y gosu; \
	rm -rf /var/lib/apt/lists/*; \
# verify that the binary works
	gosu nobody true


RUN chmod +x /usr/bin/goose
RUN chmod +x /go/src/github.com/AdRoll/batchiepatchie/docker_run.sh
CMD ["/go/src/github.com/AdRoll/batchiepatchie/docker_run.sh"]
