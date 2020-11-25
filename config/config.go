package config

/*
 This module reads and does some basic validation on the TOML file used for
 Batchiepatchie configuration. It also fetches things from S3 (database
 password) if it's configured so.

 An exported structure, Config, is then exported to rest of Batchie Patchie.
*/

import (
	"fmt"
	"reflect"

	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/AdRoll/batchiepatchie/envsubstituter"
	"github.com/AdRoll/batchiepatchie/fetcher"
	"github.com/BurntSushi/toml"
	log "github.com/sirupsen/logrus"
)

type Config struct {
	Port                    int    `toml:"port"`
	Host                    string `toml:"host"`
	DatabaseHost            string `toml:"database_host"`
	DatabasePort            int    `toml:"database_port"`
	DatabaseUsername        string `toml:"database_username"`
	DatabaseName            string `toml:"database_name"`
	DatabasePassword        string `toml:"database_password"`
	DatabaseRootCertificate string `toml:"database_root_certificate"`

	LogEntriesKey string `toml:"logentries_token"`

	Region string `toml:"region"`

	PasswordBucket string `toml:"password_bucket"`
	PasswordKey    string `toml:"password_key"`

	FrontendAssets            string `toml:"frontend_assets"`
	FrontendAssetsLocalPrefix string `toml:"frontend_assets_local_prefix"`
	FrontendAssetsBucket      string `toml:"frontend_assets_bucket"`
	FrontendAssetsKey         string `toml:"frontend_assets_key"`

	SyncPeriod  int `toml:"sync_period"`
	ScalePeriod int `toml:"scale_period"`

	KillStuckJobs bool `toml:"kill_stuck_jobs"`

	UseDatadogTracing bool `toml:"use_datadog_tracing"`
}

// Store config in a global variable
var Conf Config

func readPasswordConfiguration(contents string) (*string, error) {
	var pw_conf Config
	if _, err := toml.Decode(contents, &pw_conf); err != nil {
		return nil, err
	}

	if pw_conf.DatabasePassword == "" {
		return nil, fmt.Errorf("No passwords specified in password file.")
	}

	return &pw_conf.DatabasePassword, nil
}

func ReadConfiguration(filename string) error {
	tomlData, err := fetcher.ReadAllNoSessions(filename)
	if err != nil {
		return err
	}

	Conf = Config{
		// Default values here
		SyncPeriod:    30,
		ScalePeriod:   30,
		KillStuckJobs: false,
	}
	if _, err := toml.Decode(string(tomlData), &Conf); err != nil {
		return err
	}

	// Substitute everything with environment variables. (using reflection)
	// Checkout envsubstituter module, it injects environment variables.
	rconf := reflect.ValueOf(&Conf)
	for i := 0; i < rconf.Elem().NumField(); i++ {
		struct_elem_v := rconf.Elem().Field(i)
		if struct_elem_v.Kind().String() == reflect.ValueOf("str").Kind().String() {
			ptr := struct_elem_v.Addr().Interface().(*string)
			sub, err := envsubstituter.EnvironmentSubstitute(*ptr)
			if err != nil {
				return err
			}
			*ptr = sub
		}
	}

	if Conf.Region == "" {
		log.Fatal("AWS region must be supplied.")
	}

	/* Sanity check configuration (Port == 0 if not supplied) */
	if Conf.Port < 1 || Conf.Port > 65535 {
		log.Fatal("Port is invalid; expecting port between 1 and 65535")
	}

	// Note: not checking password; it can be legitimately empty
	if Conf.DatabaseHost == "" || Conf.DatabaseUsername == "" || Conf.DatabaseName == "" {
		log.Fatal("Incomplete Database configuration. database_host, database_port, database_username and database_name must be supplied in .toml configuration or you must use S3 configuration.")
	}

	if Conf.DatabasePort < 1 || Conf.DatabasePort > 65535 {
		log.Fatal("Database port is invalid; expecting port between 1 and 65535.")
	}

	// Where are my frontend assets? Check that the configuration makes sense
	if Conf.FrontendAssets != "local" && Conf.FrontendAssets != "s3" {
		log.Fatal("frontend_assets must be either 'local' or 's3'.")
	}

	awsclients.OpenSessions(Conf.Region)

	if Conf.FrontendAssets == "local" {
		if Conf.FrontendAssetsBucket != "" || Conf.FrontendAssetsKey != "" {
			log.Fatal("When using frontend_assets=\"local\" then neither frontend_assets_bucket or frontend_key should be specified.")
		}

		Conf.FrontendAssetsLocalPrefix = Conf.FrontendAssetsLocalPrefix
	} else if Conf.FrontendAssets == "s3" {
		if Conf.FrontendAssetsLocalPrefix != "" {
			log.Fatal("When using frontend_assets=\"s3\" then frontend_assets_local_prefix should not be specified.")
		}
		if Conf.FrontendAssetsBucket == "" {
			log.Fatal("frontend_assets_bucket is empty. You need to set it.")
		}
		if Conf.FrontendAssetsKey == "" {
			log.Fatal("frontend_assets_key is empty. You need to set it.")
		}
	}

	if Conf.PasswordKey != "" {
		// Using S3 for passwords? Fetch the keys from AWS bucket.
		// Check that we are not using both database + KMS conf
		if Conf.DatabasePassword != "" {
			log.Fatal("Both KMS and non-KMS password supplied; can't decide which one to use.")
		}
		secret_key := Conf.PasswordKey

		s3path := "s3://" + Conf.PasswordBucket + "/" + secret_key

		log.Info("Fetching secret key from ", s3path)
		out, err := fetcher.ReadAll(s3path)
		if err != nil {
			log.Fatal("Cannot get secret key file: ", err)
		}

		pw, err := readPasswordConfiguration(string(out))
		if err != nil {
			log.Fatal("Cannot parse password file: ", err)
		}

		Conf.DatabasePassword = *pw
	}

	return nil
}
