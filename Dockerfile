FROM golang:1.10

RUN mkdir -p /go/src/github.com/AdRoll/batchiepatchie
WORKDIR /go/src/github.com/AdRoll/batchiepatchie
COPY . /go/src/github.com/AdRoll/batchiepatchie
RUN chmod +x /go/src/github.com/AdRoll/batchiepatchie/docker_run.sh

RUN go get

EXPOSE 5454
EXPOSE 9999

RUN go get -u github.com/tianon/gosu
RUN go get -u github.com/pilu/fresh
RUN go get -u github.com/derekparker/delve/cmd/dlv
RUN go get -u github.com/pressly/goose/cmd/goose

CMD ["/go/src/github.com/AdRoll/batchiepatchie/docker_run.sh"]
