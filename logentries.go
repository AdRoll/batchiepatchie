package main

import (
	"github.com/jcftang/logentriesrus"
	log "github.com/sirupsen/logrus"
)

func setUpLogEntriesHooks(key string) {
	le, err := logentriesrus.NewLogentriesrusHook(key)
	if err != nil {
		log.Fatal("Cannot connect to logentries: ", err)
	}

	log.AddHook(le)
}
