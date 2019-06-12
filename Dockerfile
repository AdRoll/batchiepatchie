FROM golang:1.11

RUN mkdir -p /go/src/github.com/AdRoll/batchiepatchie
WORKDIR /go/src/github.com/AdRoll/batchiepatchie
COPY . /go/src/github.com/AdRoll/batchiepatchie

RUN go get

EXPOSE 5454
EXPOSE 9999

RUN go get -u github.com/tianon/gosu
RUN go get -u github.com/pilu/fresh
RUN go get -u github.com/derekparker/delve/cmd/dlv
RUN wget https://github.com/pressly/goose/releases/download/v2.6.0/goose-linux64 -O /usr/bin/goose
# RUN go get -u github.com/pressly/goose/cmd/goose

RUN chmod +x /usr/bin/goose
RUN chmod +x /go/src/github.com/AdRoll/batchiepatchie/docker_run.sh
CMD ["/go/src/github.com/AdRoll/batchiepatchie/docker_run.sh"]
