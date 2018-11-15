package syncer

import (
	"encoding/json"
	"time"

	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/AdRoll/batchiepatchie/config"
	"github.com/AdRoll/batchiepatchie/jobs"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
	"strconv"
)

func syncJobsStatus(storer jobs.Storer, status string, queues []string, job_summaries map[string]*jobs.JobSummary, parentSpan opentracing.Span) (map[string]bool, error) {
	topspan := opentracing.StartSpan("syncJobsStatus", opentracing.ChildOf(parentSpan.Context()))
	defer topspan.Finish()

	known_job_ids := make(map[string]bool)
	/* TODO: make the job queues we are interested in configurable */
	for _, queue := range queues {

		/* We got to be careful to make sure we look up Job ID between job
		* listings and their description. Since this is at minimum two calls
		* to AWS Batch, the state of jobs might change between their
		* invocations. Basically we can't be sure there are equal number of
		* results in job_results and job_description_results */
		job_results := make(map[string]*batch.JobSummary)
		job_description_results := make(map[string]*batch.JobDetail)

		list_jobs := batch.ListJobsInput{
			JobQueue:  &queue,
			JobStatus: &status,
		}

		var jobList *batch.ListJobsOutput
		var err error

		joblistspan := opentracing.StartSpan("listJobs", opentracing.ChildOf(topspan.Context()))

		for {
			jobList, err = awsclients.Batch.ListJobs(&list_jobs)
			if err != nil {
				joblistspan.Finish()
				return nil, err
			}

			for _, job := range jobList.JobSummaryList {
				job_results[*job.JobId] = job
			}

			if jobList.NextToken == nil {
				break
			}

			cp := string(*jobList.NextToken)
			list_jobs.NextToken = &cp
		}
		joblistspan.Finish()

		describe_jobs := batch.DescribeJobsInput{}
		doDescriptionSync := func() error {
			job_descriptions, err := awsclients.Batch.DescribeJobs(&describe_jobs)
			if err != nil {
				return err
			}
			for _, desc := range job_descriptions.Jobs {
				job_description_results[*desc.JobId] = desc
			}
			return nil
		}

		/* Also synchronize job descriptions, if we found any jobs. */
		if len(jobList.JobSummaryList) > 0 {
			describejobsspan := opentracing.StartSpan("describeJobs", opentracing.ChildOf(topspan.Context()))
			for _, job := range jobList.JobSummaryList {
				job_id_copy := string(*job.JobId)
				describe_jobs.Jobs = append(describe_jobs.Jobs, &job_id_copy)
				// Maximum number of jobs you can submit to AWS Batch description call is 100
				if len(describe_jobs.Jobs) >= 100 {
					err = doDescriptionSync()
					if err != nil {
						describejobsspan.Finish()
						return nil, err
					}
					describe_jobs = batch.DescribeJobsInput{}
				}
			}
			if len(describe_jobs.Jobs) > 0 {
				err = doDescriptionSync()
				if err != nil {
					describejobsspan.Finish()
					return nil, err
				}
			}
			describejobsspan.Finish()

			log.Info("Fetched ", len(job_description_results), " job descriptions.")
		}

		jobs_to_insert := make([]*jobs.Job, 0)

		for job_id, job := range job_results {
			if desc, ok := job_description_results[job_id]; ok {

				if desc.Status != nil {
					if _, ok := job_summaries[queue]; ok {
						switch *desc.Status {
						case "SUBMITTED":
							job_summaries[queue].Submitted++
						case "PENDING":
							job_summaries[queue].Pending++
						case "RUNNABLE":
							job_summaries[queue].Runnable++
						case "STARTING":
							job_summaries[queue].Starting++
						case "RUNNING":
							job_summaries[queue].Running++
						}
					}
				}

				timeout := -1
				for _, value := range desc.Container.Environment {
					if *value.Name == "PYBATCH_TIMEOUT" {
						timeout, err = strconv.Atoi(*value.Value)
						if err != nil {
							timeout = -1
							log.Warning("PYBATCH_TIMEOUT contains unparseable ", value.Value, " : ", err)
						}
						break
					}
				}

				var stopped_at *time.Time

				if desc.StoppedAt != nil {
					tmp := time.Unix(*desc.StoppedAt/1000, (*desc.StoppedAt%1000)*1000000).UTC()
					stopped_at = &tmp
				}

				command_line_json, err := json.Marshal(desc.Container.Command)
				if err != nil {
					log.Warning("Cannot marshal command line to JSON: ", err)
					continue
				}

				status_reason := ""
				var exit_code *int64

				if desc.StatusReason != nil {
					status_reason = *desc.StatusReason
				}

				var run_started_time *time.Time
				var log_stream_name *string
				var task_arn *string

				if len(desc.Attempts) > 0 {
					last_attempt := desc.Attempts[len(desc.Attempts)-1]
					if last_attempt.Container != nil &&
						last_attempt.Container.Reason != nil &&
						len(*last_attempt.Container.Reason) > 0 {
						status_reason = *last_attempt.Container.Reason
					}
					if last_attempt.StartedAt != nil {
						tt := time.Unix(*last_attempt.StartedAt/1000, (*last_attempt.StartedAt%1000)*1000000).UTC()
						run_started_time = &tt
					}
					if last_attempt.Container != nil && last_attempt.Container.ExitCode != nil {
						var ec int64
						ec = *last_attempt.Container.ExitCode
						exit_code = &ec
					}
					if last_attempt.Container != nil && last_attempt.Container.LogStreamName != nil {
						var lsn = *last_attempt.Container.LogStreamName
						log_stream_name = &lsn
					}
					if last_attempt.Container != nil && last_attempt.Container.TaskArn != nil {
						task_arn_c := *last_attempt.Container.TaskArn
						task_arn = &task_arn_c
					}
				}

				if log_stream_name == nil && desc.Container.LogStreamName != nil {
					var lsn = *desc.Container.LogStreamName
					log_stream_name = &lsn
				}
				if (task_arn == nil || *task_arn == "") && desc.Container.TaskArn != nil {
					task_arn_c := *desc.Container.TaskArn
					task_arn = &task_arn_c
				}
				known_job_ids[job_id] = true

				jobs_to_insert = append(jobs_to_insert, &jobs.Job{
					Id:            *job.JobId,
					Name:          *job.JobName,
					Status:        *desc.Status,
					Description:   *desc.JobDefinition,
					LastUpdated:   time.Now().UTC(),
					JobQueue:      queue,
					Image:         *desc.Container.Image,
					CreatedAt:     time.Unix(*desc.CreatedAt/1000, (*desc.CreatedAt%1000)*1000000).UTC(),
					StoppedAt:     stopped_at,
					VCpus:         *desc.Container.Vcpus,
					Memory:        *desc.Container.Memory,
					CommandLine:   string(command_line_json),
					Timeout:       timeout,
					StatusReason:  &status_reason,
					RunStartTime:  run_started_time,
					ExitCode:      exit_code,
					LogStreamName: log_stream_name,
					TaskARN:       task_arn,
				})
			}
		}

		storer.Store(jobs_to_insert)
	}

	return known_job_ids, nil
}

func syncJobs(storer jobs.Storer, queues []string) (map[string]bool, error) {
	syncjobsspan := opentracing.StartSpan("syncJobs")
	defer syncjobsspan.Finish()

	job_summaries := make(map[string]*jobs.JobSummary)
	for _, queue := range queues {
		job_summaries[queue] = &jobs.JobSummary{JobQueue: queue}
	}

	known_job_ids := make(map[string]bool)
	for _, status := range jobs.StatusList {
		log.Info("Synchronizing jobs with status ", status, "...")
		known_job_ids_status, err := syncJobsStatus(storer, status, queues, job_summaries, syncjobsspan)
		if err != nil {
			return nil, err
		}

		for key, value := range known_job_ids_status {
			known_job_ids[key] = value
		}
	}

	log.Info("Logging changes in number of jobs...\n")
	for _, summary := range job_summaries {
		summary_lst := []jobs.JobSummary{*summary}
		storer.UpdateJobSummaryLog(summary_lst)
	}

	return known_job_ids, nil
}

func RunPeriodicScaler(fs jobs.FinderStorer) {
	go func() {
		for {
			queues, err := fs.ListForcedScalingJobQueues()
			if err != nil {
				log.Warning("Cannot run scaler because I can't list job queues: ", err)
				continue
			}

			log.Info("Logging ECS cluster statuses.")
			jobs.MonitorECSClusters(fs, queues)
			log.Info("Logging ECS cluster statuses complete.")

			log.Info("Starting scaling with AWS Batch.")
			jobs.ScaleComputeEnvironments(fs, queues)
			log.Info("Scaling round complete.")

			log.Info("Logging compute environment changes.")
			jobs.MonitorComputeEnvironments(fs, queues)
			log.Info("Logging compute environments round complete.")

			jobs.KillTimedOutJobs(fs)
			time.Sleep(time.Second * time.Duration(config.Conf.ScalePeriod))
		}
	}()
}

func RunPeriodicSynchronizer(fs jobs.FinderStorer, killer jobs.Killer) {
	/* This function runs RunSynchronizer every sync_period seconds. */
	go func() {
		for {
			if config.Conf.KillStuckJobs {
				killer := func() {
					killerspan := opentracing.StartSpan("killStuckJobs")
					defer killerspan.Finish()

					log.Info("Checking and killing stuck STARTING jobs.")
					instance_ids, err := fs.GetStartingStateStuckEC2Instances()
					if err != nil {
						log.Error("Cannot get stuck starting jobs: ", err)
					}
					killer.KillInstances(instance_ids)
					log.Info("Checked and killed stuck STARTING jobs.")
				}
				killer()
			}

			queues, err := fs.ListActiveJobQueues()
			if err != nil {
				log.Warning("Cannot run synchronizer because I can't list job queues: ", err)
				continue
			}
			log.Info("Starting synchronization with AWS Batch.")
			err = RunSynchronizer(fs, queues)
			if err != nil {
				log.Error("Synchronization failed: ", err)
			}
			log.Info("Synchronized with AWS Batch.")

			time.Sleep(time.Second * time.Duration(config.Conf.SyncPeriod))
		}
	}()
}

// RunSynchronizer runs a round of synchronization with AWS batch APIs
// Note: Does AWS have api throttling?
func RunSynchronizer(fs jobs.FinderStorer, queues []string) error {
	// Synchronize jobs
	known_job_ids, err := syncJobs(fs, queues)
	if err != nil {
		return err
	}
	err = fs.StaleOldJobs(known_job_ids)
	if err != nil {
		return err
	}

	return nil
}
