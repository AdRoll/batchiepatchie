/*
Package handlers implements the http handlers for the api and defines the
Server structure for shared context between handlers.
*/
package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/AdRoll/batchiepatchie/jobs"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/labstack/echo"
	"github.com/labstack/gommon/log"
	"github.com/opentracing/opentracing-go"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

const (
	defaultQueryLimit = 100
	defaultPageNumber = 0
)

type Server struct {
	Storage jobs.FinderStorer
	Killer  jobs.Killer
	Index   []byte
}

// KillTaskID is a struct to handle JSON request to kill a task
type KillTaskID struct {
	ID string `json:"id" form:"id" query:"id"`
}

// KillTasks is a struct to handle JSON request to kill many tasks
type KillTasks struct {
	IDs []string `json:"ids" form:"ids" query:"ids"`
}

// Find is a request handler, returns json with jobs matching the query param 'q'
func (s *Server) Find(c echo.Context) error {
	span := opentracing.StartSpan("API.Find")
	defer span.Finish()

	c.QueryParams()
	search := c.QueryParam("q")
	queuesStr := c.QueryParam("queue")
	statusStr := c.QueryParam("status")
	column := c.QueryParam("sortColumn")
	sort := strings.ToUpper(c.QueryParam("sortDirection")) == "ASC"

	var queues []string
	var status []string
	if len(queuesStr) > 0 {
		queues = strings.Split(queuesStr, ",")
	}
	if len(statusStr) > 0 {
		status = strings.Split(statusStr, ",")
	}

	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		// if err, set default
		page = 0
	}

	foundJobs, err := s.Storage.Find(&jobs.Options{
		Search:  search,
		Limit:   defaultQueryLimit,
		Offset:  page * defaultQueryLimit,
		Queues:  queues,
		SortBy:  column,
		SortAsc: sort,
		Status:  status,
	})

	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	c.JSON(http.StatusOK, foundJobs)
	return nil
}

func (s *Server) GetStatus(c echo.Context) error {
	span := opentracing.StartSpan("API.GetStatus")
	defer span.Finish()

	query := c.Param("id")

	job, err := s.Storage.GetStatus(query)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	if job == nil {
		c.JSON(http.StatusNotFound, job)
		return nil
	} else {
		c.JSON(http.StatusOK, job)
		return nil
	}
}

// FindOne is a request handler, returns a job matching the query parameter 'q'
func (s *Server) FindOne(c echo.Context) error {
	span := opentracing.StartSpan("API.FindOne")
	defer span.Finish()

	query := c.Param("id")

	job, err := s.Storage.FindOne(query)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	c.JSON(http.StatusOK, job)
	return nil
}

// KillMany is a request handler, kills a job matching the post parameter 'id' (AWS task ID)
func (s *Server) KillMany(c echo.Context) error {
	span := opentracing.StartSpan("API.KillMany")
	defer span.Finish()

	obj, err := BodyToKillTask(c)

	if err != nil {
		c.JSON(http.StatusBadRequest, "{\"error\": \"Cannot deserialize\"}")
	}

	values := obj.IDs

	results := make(map[string]string)

	for _, value := range values {
		err := s.Killer.KillOne(value, "terminated from UI", s.Storage)
		if err != nil {
			results[value] = err.Error()
		}
		results[value] = "OK"
	}

	c.JSON(http.StatusOK, results)
	return nil
}

func (s *Server) FetchLogs(c echo.Context) error {
	span := opentracing.StartSpan("API.FetchLogs")
	defer span.Finish()

	const LOG_GROUP_NAME = "/aws/batch/job"

	format := c.QueryParam("format")

	id := c.Param("id")

	job, err := s.Storage.FindOne(id)
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	svc := awsclients.CloudWatchLogs

	oldStyleLogs := func() (*string, error) {
		// AWS Batch seems to cap name strings to 50 characters for cloudwatch.
		truncated_job_name := job.Name
		if len(job.Name) > 50 {
			truncated_job_name = job.Name[:50]
		}

		s := truncated_job_name + "/" + id + "/"
		return &s, nil
	}
	newStyleLogs := func() (*string, error) {
		log_stream_name := job.LogStreamName
		if log_stream_name == nil || len(*log_stream_name) == 0 {
			return nil, fmt.Errorf("No LogStreamName on job.")
		}

		return log_stream_name, nil
	}

	logSources := [...]func() (*string, error){oldStyleLogs, newStyleLogs}
	var logStreams *cloudwatchlogs.DescribeLogStreamsOutput

	for _, log_source := range logSources {
		var name *string
		name, err = log_source()
		if err != nil {
			continue
		}
		logStreams, err = svc.DescribeLogStreams(&cloudwatchlogs.DescribeLogStreamsInput{
			LogGroupName:        aws.String(LOG_GROUP_NAME),
			LogStreamNamePrefix: aws.String(*name),
		})
		if err != nil || len(logStreams.LogStreams) <= 0 {
			continue
		}
		break
	}

	if err != nil {
		log.Error(err)
		c.String(http.StatusInternalServerError, err.Error())
		return err
	}

	if len(logStreams.LogStreams) <= 0 {
		c.JSON(http.StatusNotFound, "")
		return nil
	}

	Events := []*cloudwatchlogs.OutputLogEvent{}

	startFromHead := true
	logEvents, err2 := svc.GetLogEvents(&cloudwatchlogs.GetLogEventsInput{
		LogGroupName:  aws.String(LOG_GROUP_NAME),
		LogStreamName: logStreams.LogStreams[0].LogStreamName,
		StartFromHead: &startFromHead,
	})

	if err2 != nil {
		c.String(http.StatusOK, err2.Error())
		return err2
	}
	Events = append(Events, logEvents.Events...)

	prevToken := ""
	nextToken := logEvents.NextForwardToken

	for *nextToken != prevToken {
		logEvents, err2 = svc.GetLogEvents(&cloudwatchlogs.GetLogEventsInput{
			LogGroupName:  aws.String(LOG_GROUP_NAME),
			LogStreamName: logStreams.LogStreams[0].LogStreamName,
			StartFromHead: &startFromHead,
			NextToken:     nextToken,
		})
		if err2 != nil {
			c.String(http.StatusOK, err2.Error())
			return err2
		}
		Events = append(Events, logEvents.Events...)
		prevToken = *nextToken
		nextToken = logEvents.NextForwardToken
	}

	if format == "text" {
		var buffer bytes.Buffer
		for _, event := range Events {
			buffer.WriteString(*event.Message + "\n")
		}
		c.String(http.StatusOK, buffer.String())
	} else if format == "json" {
		c.JSON(http.StatusOK, Events)
	} else {
		c.JSON(http.StatusOK, Events)
	}

	return nil
}

// KillOne is a request handler, kills a job matching the post parameter 'id' (AWS task ID)
func (s *Server) KillOne(c echo.Context) error {
	span := opentracing.StartSpan("API.KillOne")
	defer span.Finish()

	task := new(KillTaskID)

	if err := c.Bind(task); err != nil {
		return err
	}

	err := s.Killer.KillOne(task.ID, "terminated from UI", s.Storage)

	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	c.JSON(http.StatusOK, task.ID)
	return nil
}

func (s *Server) ListActiveJobQueues(c echo.Context) error {
	span := opentracing.StartSpan("API.ListActiveJobQueues")
	defer span.Finish()

	active_job_queues, err := s.Storage.ListActiveJobQueues()
	if err != nil {
		log.Error(err)
		c.JSON(http.StatusInternalServerError, err)
		return err
	}

	c.JSON(http.StatusOK, active_job_queues)
	return nil
}

func (s *Server) ListAllJobQueues(c echo.Context) error {
	span := opentracing.StartSpan("API.ListAllJobQueues")
	defer span.Finish()

	// This function gets *all* job queues, even those not registered to
	// Batchiepatchie.  Therefore, we must ask AWS about all the job
	// queues. (as opposed to looking in our data store).
	svc := awsclients.Batch
	result := make([]string, 0)

	var next_token *string

	for {
		var input *batch.DescribeJobQueuesInput
		if next_token != nil {
			input = &batch.DescribeJobQueuesInput{NextToken: next_token}
		} else {
			input = &batch.DescribeJobQueuesInput{}
		}
		job_queues, err := svc.DescribeJobQueues(input)
		if err != nil {
			c.JSON(http.StatusInternalServerError, err)
			return err
		}

		for _, job_queue := range job_queues.JobQueues {
			name := job_queue.JobQueueName
			result = append(result, *name)
		}
		if input.NextToken != nil {
			next_token = input.NextToken
		} else {
			break
		}
	}

	c.JSON(http.StatusOK, result)
	return nil
}

func (s *Server) ActivateJobQueue(c echo.Context) error {
	span := opentracing.StartSpan("API.ActivateJobQueue")
	defer span.Finish()

	job_queue_name := c.Param("name")
	err := s.Storage.ActivateJobQueue(job_queue_name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return err
	} else {
		c.String(http.StatusOK, "[]")
		return nil
	}
}

func (s *Server) DeactivateJobQueue(c echo.Context) error {
	span := opentracing.StartSpan("API.DeactivateJobQueue")
	defer span.Finish()

	job_queue_name := c.Param("name")
	err := s.Storage.DeactivateJobQueue(job_queue_name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err)
		return err
	} else {
		c.String(http.StatusOK, "[]")
		return nil
	}
}

// IndexHandler returns
func (s *Server) IndexHandler(c echo.Context) error {
	c.HTMLBlob(http.StatusOK, s.Index)
	return nil
}

func BodyToKillTask(c echo.Context) (KillTasks, error) {
	var obj KillTasks

	s, err := ioutil.ReadAll(c.Request().Body)
	if err != nil {
		log.Error("Cannot read request")
		return obj, err
	}

	if err := json.Unmarshal(s, &obj); err != nil {
		return obj, err
	}

	return obj, nil

}
