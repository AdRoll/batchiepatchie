package main

import (
	"net/http"
	"os"
	"path"
	"strconv"

	"github.com/AdRoll/batchiepatchie/config"
	"github.com/AdRoll/batchiepatchie/fetcher"
	"github.com/AdRoll/batchiepatchie/handlers"
	"github.com/AdRoll/batchiepatchie/jobs"
	"github.com/AdRoll/batchiepatchie/syncer"
	"github.com/bakatz/echo-logrusmiddleware"
	"github.com/labstack/echo"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/opentracer"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

// fetchIndex fetches the index.html from s3
func fetchIndex() ([]byte, error) {
	if config.Conf.FrontendAssets == "local" {
		dir := path.Join(config.Conf.FrontendAssetsLocalPrefix, "index.html")
		log.Info("Getting index.html from local file:", dir)
		return fetcher.ReadAll(dir)
	}
	s3path := "s3://" + config.Conf.FrontendAssetsBucket + "/" + config.Conf.FrontendAssetsKey
	log.Info("Downloading index.html from ", s3path)
	return fetcher.ReadAll(s3path)
}

func pingHandler(c echo.Context) error {
	c.String(http.StatusOK, "pong")
	return nil
}

func main() {
	configurationFile := ""
	if len(os.Args) > 2 {
		log.Fatal("batchiepatchie expects exactly one argument: filename to .toml configuration.")
	} else if len(os.Args) == 2 {
		configurationFile = os.Args[1]
	} else {
		/* Fallback to using environment variables */
		configurationFile = os.Getenv("BATCHIEPATCHIE_CONFIG")
		if configurationFile == "" {
			log.Fatal("No configuration file passed through either command line argument or BATCHIEPATCHIE_CONFIG environment variable.")
		}
	}

	log.SetFormatter(&log.JSONFormatter{})
	log.SetOutput(os.Stderr)

	// Sets the global config.Conf
	err := config.ReadConfiguration(configurationFile)
	if err != nil {
		log.Fatal("Reading configuration failed, ", err)
	}

	if config.Conf.LogEntriesKey != "" {
		log.Info("logentries_token supplied, will connect to LogEntries.")
		logentries_host := "data.logentries.com:443"
		if config.Conf.LogEntriesHost != "" {
			logentries_host = config.Conf.LogEntriesHost
		}
		setUpLogEntriesHooks(logentries_host, config.Conf.LogEntriesKey)
	}

	var trace opentracing.Tracer
	if config.Conf.UseDatadogTracing {
		ip := os.Getenv("BATCHIEPATCHIE_IP")
		if ip != "" {
			// If we have been passed an IP explictly; attempt to
			// use it to connect to DataDog tracer When we run
			// batchiepatchie inside Docker container and ddtracer
			// on the host; this lets us connect to the agent
			// running on host.
			agentAddr := ip + ":8126"
			log.Info("Will attempt to ddtrace into ", agentAddr)
			trace = opentracer.New(tracer.WithServiceName("batchiepatchie"), tracer.WithAgentAddr(agentAddr))
		} else {
			trace = opentracer.New(tracer.WithServiceName("batchiepatchie"))
		}
	} else {
		trace = opentracing.NoopTracer{}
	}
	opentracing.SetGlobalTracer(trace)

	storage, err := jobs.NewPostgreSQLStore(config.Conf.DatabaseHost, config.Conf.DatabasePort, config.Conf.DatabaseUsername, config.Conf.DatabaseName, config.Conf.DatabasePassword, config.Conf.DatabaseRootCertificate)
	if err != nil {
		log.Fatal("Creating postgresql store failed, ", err)
	}
	log.Info("Successfully connected to PostgreSQL database.")

	killer, err := jobs.NewKillerHandler()
	if err != nil {
		log.Fatal("Creating killer handler failed, ", err)
	}
	log.Info("killer handler started.")

	index, err := fetchIndex()
	if err != nil {
		log.Error("Falling back to basic index.html: ", err)
		version := os.Getenv("VERSION")
		if version == "" {
			index = []byte("<h1>Cannot find index.html. VERSION environment variable is not set. Check that frontend has been deployed correctly and then restart backend.</h1>")
		} else {
			index = []byte("<h1>Cannot find index.html. (VERSION environment variable has been set but no file could be fetched). Check that frontend has been deployed correctly and then restart backend.</h1>")
		}
	}

	// Launch the periodic synchronizer
	syncer.RunPeriodicSynchronizer(storage, killer)
	// Launch the periodic scaler
	syncer.RunPeriodicScaler(storage)

	// handle.Server is a structure to save context shared between requests
	s := &handlers.Server{
		Storage: storage,
		Killer:  killer,
		Index:   index,
	}

	e := echo.New()

	// Logging middleware for API requests
	e.Logger = logrusmiddleware.Logger{Logger: log.StandardLogger()}
	e.Use(logrusmiddleware.Hook())

	// Jobs API
	api := e.Group("/api/v1")
	{
		api.GET("/jobs/:id", s.FindOne)
		api.GET("/jobs", s.Find)
		api.POST("/jobs/kill", s.KillMany)
		api.GET("/jobs/:id/logs", s.FetchLogs)
		api.GET("/job_queues/active", s.ListActiveJobQueues)
		api.GET("/job_queues/all", s.ListAllJobQueues)
		api.POST("/job_queues/:name/activate", s.ActivateJobQueue)
		api.POST("/job_queues/:name/deactivate", s.DeactivateJobQueue)
		api.GET("/jobs/:id/status", s.GetStatus)
		api.POST("/jobs/notify", s.JobStatusNotification)
		api.GET("/jobs/:id/status_websocket", s.SubscribeToJobEvent)
		api.GET("/jobs/stats", s.JobStats)
	}

	e.GET("/ping", pingHandler)
	e.GET("/", s.IndexHandler)
	e.GET("/stats", s.IndexHandler)
	e.GET("/index.html", s.IndexHandler)

	// These are pseudo-URLs, the frontend will handle displaying the correct page
	e.GET("/job/:id", s.IndexHandler)
	e.GET("/job_queues", s.IndexHandler)

	if config.Conf.FrontendAssets == "local" {
		e.Static("/*", config.Conf.FrontendAssetsLocalPrefix)
	}

	// Launch web server
	e.Logger.Fatal(e.Start(config.Conf.Host + ":" + strconv.Itoa(config.Conf.Port)))
}
