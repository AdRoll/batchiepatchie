package handlers

import (
	"encoding/json"
	"github.com/AdRoll/batchiepatchie/jobs"
	"github.com/labstack/echo"
	"github.com/labstack/gommon/log"
	"github.com/opentracing/opentracing-go"
	"io"
	"io/ioutil"
	"regexp"
	"strconv"
	"time"
)

// This structure and the ones below it match the CloudWatch event JSON we get from AWS Lambda function.
// It doesn't match all the fields but matches most of the useful ones we track.
type JobStatusNotification struct {
	Time   string                      `json:"time"`
	Detail JobStatusNotificationDetail `json:"detail"`
}

type JobStatusNotificationDetail struct {
	JobName       string                         `json:"jobName"`
	JobId         string                         `json:"jobId"`
	JobQueue      string                         `json:"jobQueue"`
	Status        string                         `json:"status"`
	CreatedAt     int64                          `json:"createdAt"`
	StartedAt     *int64                         `json:"startedAt"`
	Container     JobStatusNotificationContainer `json:"container"`
	JobDefinition string                         `json:"jobDefinition"`
}

type env struct {
	Key   string `json:"name"`
	Value string `json:"value"`
}

type JobStatusNotificationContainer struct {
	Image       string   `json:"image"`
	Vcpus       int64    `json:"vcpus"`
	Memory      int64    `json:"memory"`
	Command     []string `json:"command"`
	Environment []env    `json:"environment"`
	TaskArn     *string  `json:"taskArn"`
}

var arnRegex = regexp.MustCompile("^arn.*/(.+?)$")

func stripArn(arnied_name string) string {
	match := arnRegex.FindStringSubmatch(arnied_name)
	if match == nil {
		return arnied_name
	}
	return match[1]
}

func (s *Server) JobStatusNotification(c echo.Context) error {
	span := opentracing.StartSpan("API.JobStatusNotification")
	defer span.Finish()

	// This function can be called from outside to update job status.
	// It's meant to used from an AWS Lambda function that is triggered on AWS Batch events.
	body, err := ioutil.ReadAll(io.LimitReader(c.Request().Body, 100000))
	if err != nil {
		log.Warn("Failed reading job status notification posted on our API: ", err)
		return err
	}

	var job_status_notification JobStatusNotification

	if err = json.Unmarshal(body, &job_status_notification); err != nil {
		log.Warn("Cannot unmarshal JSON for job status notification posted on our API: ", err)
		return err
	}

	now := time.Now()

	// Sometimes we get these jobs that have barely any details in them.
	// The UI and the database can't deal with them so we skip them if it happens.
	if job_status_notification.Detail.JobName == "" {
		return nil
	}

	// Convert jobStatusNotification into jobs.Job definition that our
	// PostgreSQL storer understands.
	job := jobs.Job{}
	job.Id = job_status_notification.Detail.JobId
	job.Name = job_status_notification.Detail.JobName
	job.Status = job_status_notification.Detail.Status
	job.Description = job_status_notification.Detail.JobDefinition
	job.LastUpdated = now
	job.JobQueue = stripArn(job_status_notification.Detail.JobQueue)
	job.Image = job_status_notification.Detail.Container.Image
	job.CreatedAt = time.Unix(job_status_notification.Detail.CreatedAt/1000, 0)
	if job_status_notification.Detail.StartedAt != nil {
		time := time.Unix(*job_status_notification.Detail.StartedAt/1000, 0)
		job.RunStartTime = &time
	} else {
		job.RunStartTime = nil
	}
	job.VCpus = job_status_notification.Detail.Container.Vcpus
	job.Memory = job_status_notification.Detail.Container.Memory
	cmd, _ := json.Marshal(job_status_notification.Detail.Container.Command)
	job.CommandLine = string(cmd)

	timeout := -1
	for _, value := range job_status_notification.Detail.Container.Environment {
		if value.Key == "PYBATCH_TIMEOUT" {
			timeout, err = strconv.Atoi(value.Value)
			if err != nil {
				timeout = -1
				log.Warn("Cannot make sense of PYBATCH_TIMEOUT in job status notification: ", value.Value, " : ", err)
			}
			break
		}
	}
	job.Timeout = timeout

	jobs := make([]*jobs.Job, 1)
	jobs[0] = &job

	s.Storage.Store(jobs)
	log.Info("Got job status notification for job: ", job_status_notification.Detail.JobId)
	return nil
}
