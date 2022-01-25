package main

import (
	"github.com/jcftang/logentriesrus"
	log "github.com/sirupsen/logrus"
)

func setUpLogEntriesHooks(host string, key string) {
	le, err := logentriesrus.NewLogentriesrusHook(host, key)
	if err != nil {
		log.Fatal("Cannot connect to logentries: ", err)
	}

	log.AddHook(le)
}
