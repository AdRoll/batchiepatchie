FROM golang:1.8

RUN mkdir -p /go/src/github.com/SemanticSugar/batchiepatchie
WORKDIR /go/src/github.com/SemanticSugar/batchiepatchie
COPY . /go/src/github.com/SemanticSugar/batchiepatchie
RUN chmod +x /go/src/github.com/SemanticSugar/batchiepatchie/docker_run.sh

RUN go-wrapper download
RUN go-wrapper install

EXPOSE 5454
EXPOSE 9999

RUN go get -u github.com/tianon/gosu
RUN go get -u github.com/pilu/fresh
RUN go get -u github.com/derekparker/delve/cmd/dlv
RUN go get -u github.com/pressly/goose/cmd/goose

CMD ["/go/src/github.com/SemanticSugar/batchiepatchie/docker_run.sh"]
