package jobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"

	// postgres sql driver
	_ "github.com/lib/pq"
)

type postgreSQLStore struct {
	connection               *sql.DB
	jobStatusSubscribers     map[string]([]chan<- Job)
	jobStatusSubscribersLock sync.Mutex
}

// Sort options
const (
	sortByID          = "job_id"
	sortByName        = "job_name"
	sortByStatus      = "status"
	sortByLastUpdated = "last_updated"
	sortByStoppedAt   = "stopped_at"
)

// parseSortColumn parses a string into a valid sorting value
// Accepts: id, name, status and last_updated (default: last_updated)
func parseSortColumn(input string) string {
	switch input {
	case "id":
		return sortByID
	case "name":
		return sortByName
	case "status":
		return sortByStatus
	case "stopped_at":
		return sortByStoppedAt
	default:
		return sortByLastUpdated
	}
}

func searchEscape(search string) string {
	/* Escape characters so they won't be interpreted as search special
	 * characters */
	/* Percent sign, underscore and backslash are in this group. The string is
	 * otherwise escaped normally by SQL so this won't result in SQL injection
	 * attacks, but I suppose if we didn't escape search might crash. */
	return strings.Replace(strings.Replace(strings.Replace(search, "\\", "\\\\", -1), "%", "\\%", -1), "_", "\\_", -1)
}

func (pq *postgreSQLStore) Find(opts *Options) ([]*Job, error) {
	var sortDirection string
	if opts.SortAsc {
		sortDirection = "ASC"
	} else {
		sortDirection = "DESC"
	}

	query := `
			SELECT job_id,
				job_name,
				status,
				job_definition,
				last_updated,
				job_queue,
				image,
				created_at,
				stopped_at,
				vcpus,
				memory,
				timeout,
				command_line,
				status_reason,
				run_started_at,
				exitcode,
				log_stream_name,
				termination_requested,
				task_arn
			FROM jobs
		`

	var whereClausesPr = []string{}
	var whereClausesScan = []string{}
	args := make([]interface{}, 0)

	args = append(args, opts.Limit)
	args = append(args, opts.Offset)

	if opts.Search != "" {
		glob_search := "%" + searchEscape(opts.Search) + "%"
		args = append(args, glob_search)
		index := strconv.Itoa(len(args))

		whereClausesScan = append(whereClausesScan, fmt.Sprintf(`(last_updated > (now() - interval '30 days') AND
			  (job_id LIKE $%s OR
			   job_name LIKE $%s OR
			   job_queue LIKE $%s OR
			   image LIKE $%s OR
			   command_line LIKE $%s OR
			   job_definition LIKE $%s))
			`, index, index, index, index, index, index))
	}

	if opts.Status != "" {
		args = append(args, opts.Status)
		whereClausesPr = append(whereClausesPr, "status = $"+strconv.Itoa(len(args)))
	}

	if opts.Queue != "" {
		args = append(args, opts.Queue)
		whereClausesPr = append(whereClausesPr, "job_queue = $"+strconv.Itoa(len(args)))
	}

	unconditional_filters := strings.Join(whereClausesPr, " AND ")
	scanner := strings.Join(whereClausesScan, " AND ")

	if len(unconditional_filters) > 0 || len(scanner) > 0 {
		query += " WHERE "
		if len(unconditional_filters) > 0 {
			query += "(" + unconditional_filters + ")"
		}

		if len(scanner) > 0 && len(unconditional_filters) > 0 {
			query += " AND ("
		}

		if len(scanner) > 0 {
			query += "(" + scanner + ")"
		}
		if len(scanner) > 0 && len(unconditional_filters) > 0 {
			query += ")"
		}
	}

	query += fmt.Sprintf(" ORDER BY %s %s LIMIT $1 OFFSET $2", parseSortColumn(opts.SortBy), sortDirection)

	rows, err := pq.connection.Query(
		query,
		args...)
	if err != nil {
		log.Error("Find failed with error: ", err)
		return nil, err
	}
	defer rows.Close()

	allJobs := make([]*Job, 0)
	for rows.Next() {
		var job Job
		if err := rows.Scan(&job.Id, &job.Name, &job.Status, &job.Description, &job.LastUpdated, &job.JobQueue, &job.Image, &job.CreatedAt, &job.StoppedAt, &job.VCpus, &job.Memory, &job.Timeout, &job.CommandLine, &job.StatusReason, &job.RunStartTime, &job.ExitCode, &job.LogStreamName, &job.TerminationRequested, &job.TaskARN); err != nil {
			log.Warning(err)
			return nil, err
		}

		allJobs = append(allJobs, &job)
	}
	return allJobs, nil
}

func (pq *postgreSQLStore) FindTimedoutJobs() ([]string, error) {
	query := `
        SELECT job_id
	FROM jobs
	WHERE created_at + interval '1 second' * timeout < now()
	  AND timeout != -1 AND status != 'SUCCEEDED' AND status != 'GONE' AND status != 'FAILED'`

	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Warning("Cannot find timed out jobs from database: ", err)
		return nil, err
	}
	defer rows.Close()

	job_ids := make([]string, 0)

	for rows.Next() {
		var job_id string
		if err := rows.Scan(&job_id); err != nil {
			log.Error("Cannot scan rows in finding jobs that have timed out: ", err)
			return nil, err
		}

		job_ids = append(job_ids, job_id)
	}

	return job_ids, nil
}

func (pq *postgreSQLStore) FindOne(index string) (*Job, error) {
	query := `
			SELECT job_id,
				job_name,
				status,
				job_definition,
				last_updated,
				job_queue,
				image,
				created_at,
				stopped_at,
				vcpus,
				memory,
				timeout,
				command_line,
				status_reason,
				run_started_at,
				exitcode,
				log_stream_name,
				termination_requested,
				jobs.task_arn,
				ta.instance_id,
				ta.public_ip,
				ta.private_ip
			FROM jobs
			LEFT OUTER JOIN task_arns_to_instance_info ta ON
			ta.task_arn = jobs.task_arn
			WHERE jobs.job_id = $1
		`

	rows, err := pq.connection.Query(query, index)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var job Job
	rows.Next()

	if job.StatusReason == nil {
		sr := ""
		job.StatusReason = &sr
	}

	if err := rows.Scan(&job.Id, &job.Name, &job.Status, &job.Description, &job.LastUpdated, &job.JobQueue, &job.Image, &job.CreatedAt, &job.StoppedAt, &job.VCpus, &job.Memory, &job.Timeout, &job.CommandLine, &job.StatusReason, &job.RunStartTime, &job.ExitCode, &job.LogStreamName, &job.TerminationRequested, &job.TaskARN, &job.InstanceID, &job.PublicIP, &job.PrivateIP); err != nil {
		log.Warning(err)
		return nil, err
	}

	return &job, nil
}

func (pq *postgreSQLStore) StaleOldJobs(job_ids map[string]bool) error {
	/*
	   What happens in this function is that we take all jobs we currently know
	   about and then mark all jobs that are not either SUCCESS or FAILED as GONE.

	   Sometimes batchiepatchie misses or AWS Batch forgets about jobs and this
	   can cause a job to be perpetually in RUNNING or RUNNABLE state in the
	   database. This function marks them so user knows they are no longer
	   available.
	*/
	err := func() error {
		transaction, err := pq.connection.Begin()
		if err != nil {
			log.Warning(err)
			return err
		}
		should_commit := false
		final := func() error {
			if should_commit {
				err := transaction.Commit()
				if err != nil {
					log.Warning("Cannot commit transaction: ", err)
					return err
				}
			} else {
				err := transaction.Rollback()
				if err != nil {
					log.Warning("Cannot roll back transaction: ", err)
					return err
				}
			}
			return nil
		}
		defer final()

		query := `create temporary table jobs_known_about ( job_id text primary key ) on commit drop`
		_, err = transaction.Exec(query)
		if err != nil {
			log.Warning("Cannot create temporary table in StaleOldJobs: ", err)
			return err
		}

		for job_id := range job_ids {
			query := `insert into jobs_known_about ( job_id ) values ( $1 )`
			_, err = transaction.Exec(query, job_id)
			if err != nil {
				log.Warning("Cannot insert into jobs_known_about in StaleOldJobs: ", err)
				return err
			}
		}

		where_clause := `WHERE j.status NOT IN ('GONE', 'SUCCEEDED', 'FAILED') ` +
			`AND j.job_id NOT IN (SELECT jka.job_id FROM jobs_known_about jka) ` +
			`AND AGE(CURRENT_TIMESTAMP, j.last_updated) > INTERVAL '300 sec'`
		query = `UPDATE jobs j SET status = 'GONE' ` + where_clause
		_, err = transaction.Exec(query)
		if err != nil {
			log.Warning("Cannot update GONE status: ", err)
			return err
		}

		should_commit = true
		// Note: transaction commit errors are silenced (but they are logged)
		return nil
	}()

	if err != nil {
		return err
	}
	return pq.flushJobStatusSubscriptions()
}

func (pq *postgreSQLStore) Store(jobs []*Job) error {
	/* Don't bother going to database to insert 0 jobs */
	if len(jobs) == 0 {
		return nil
	}

	err := func() error {
		transaction, err := pq.connection.Begin()
		if err != nil {
			log.Warning(err)
			return err
		}
		should_commit := false
		final := func() error {
			if should_commit {
				err := transaction.Commit()
				if err != nil {
					log.Warning("Cannot commit transaction: ", err)
					return err
				}
				log.Info("Committed ", len(jobs), " jobs to database.")
			} else {
				err := transaction.Rollback()
				if err != nil {
					log.Warning("Cannot roll back transaction: ", err)
					return err
				}
			}
			return nil
		}
		defer final()

		for _, job := range jobs {
			var err error

			if job.StoppedAt == nil {
				query := `insert into jobs (
			  job_id,
			  job_name,
			  job_definition,
			  job_queue,
			  image,
			  status,
			  created_at,
			  vcpus,
			  memory,
			  timeout,
			  command_line,
			  last_updated,
		          status_reason,
		          run_started_at,
		          exitcode,
		          log_stream_name,
		          task_arn)
			  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		      on conflict (job_id) do update set status = $6, last_updated = $12, status_reason = $13, run_started_at = $14, exitcode = $15, log_stream_name = $16, task_arn = $17
		      where jobs.status <> $6 or jobs.status_reason <> $13 or jobs.exitcode <> $15 or jobs.log_stream_name <> $16 or jobs.task_arn <> $17 or (jobs.task_arn is null and $17 is not null) or (jobs.log_stream_name is null and $16 is not null) or (jobs.status_reason is null and $13 is not null) or (jobs.exitcode is null and $15 is not null)`
				_, err = transaction.Exec(
					query,
					job.Id,
					job.Name,
					job.Description,
					job.JobQueue,
					job.Image,
					job.Status,
					job.CreatedAt.Format("2006-01-02 15:04:05"),
					job.VCpus,
					job.Memory,
					job.Timeout,
					job.CommandLine,
					job.LastUpdated.Format("2006-01-02 15:04:05"),
					job.StatusReason,
					job.RunStartTime,
					job.ExitCode,
					job.LogStreamName,
					job.TaskARN)
			} else {
				query := `insert into jobs (
			  job_id,
			  job_name,
			  job_definition,
			  job_queue,
			  image,
			  status,
			  created_at,
			  stopped_at,
			  vcpus,
			  memory,
			  timeout,
			  command_line,
			  last_updated,
		          status_reason,
		          run_started_at,
		          exitcode,
		          log_stream_name,
		          task_arn)
			  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		      on conflict (job_id) do update set status = $6, last_updated = $13, stopped_at = $8, status_reason = $14, run_started_at = $15, exitcode = $16, log_stream_name = $17, task_arn = $18
		      where jobs.status <> $6 or jobs.status_reason <> $14 or jobs.exitcode <> $16 or jobs.log_stream_name <> $17 or jobs.task_arn <> $18 or (jobs.task_arn is null and $18 is not null) or (jobs.log_stream_name is null and $17 is not null) or (jobs.status_reason is null and $14 is not null) or (jobs.exitcode is null and $16 is not null)`
				_, err = transaction.Exec(
					query,
					job.Id,
					job.Name,
					job.Description,
					job.JobQueue,
					job.Image,
					job.Status,
					job.CreatedAt.Format("2006-01-02 15:04:05"),
					job.StoppedAt.Format("2006-01-02 15:04:05"),
					job.VCpus,
					job.Memory,
					job.Timeout,
					job.CommandLine,
					job.LastUpdated.Format("2006-01-02 15:04:05"),
					job.StatusReason,
					job.RunStartTime,
					job.ExitCode,
					job.LogStreamName,
					job.TaskARN)
			}

			if err != nil {
				log.Warning(err)
				return err
			}
		}
		should_commit = true
		return nil
	}()

	if err != nil {
		return err
	}

	return pq.flushJobStatusSubscriptions()
}

func (pq *postgreSQLStore) EstimateRunningLoadByJobQueue(queues []string) (map[string]RunningLoad, error) {
	query := `
	  SELECT job_queue,SUM(vcpus),SUM(memory) FROM jobs WHERE
	    status = 'SUBMITTED' OR
	    status = 'PENDING' OR
	    status = 'RUNNABLE' OR
	    status = 'STARTING' OR
	    status = 'RUNNING'
	    GROUP BY job_queue`
	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Error("EstimateRunningLoadByJobQueue failed to query database: ", err)
		return nil, err
	}
	defer rows.Close()

	mapping := make(map[string]RunningLoad)

	for rows.Next() {
		var job_queue string
		var vcpus int64
		var memory int64
		if err := rows.Scan(&job_queue, &vcpus, &memory); err != nil {
			log.Error("Cannot scan rows in EstimateRunningLoadByJobQueue: ", err)
			return nil, err
		}

		mapping[job_queue] = RunningLoad{WantedVCpus: vcpus, WantedMemory: memory}
	}

	/* The SQL query doesn't catch cases where no jobs are running (they will be missing from map).
	   Manually fill out the missing job_queues to the load estimate map
	   before we return from this function */
	for _, queue := range queues {
		if _, ok := mapping[queue]; !ok {
			mapping[queue] = RunningLoad{WantedVCpus: 0, WantedMemory: 0}
		}
	}

	return mapping, nil
}

func (pq *postgreSQLStore) UpdateJobSummaryLog(job_summaries []JobSummary) error {
	ctx_timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	transaction, err := pq.connection.BeginTx(ctx_timeout, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		log.Warning(err)
		return err
	}
	should_commit := false
	final := func() error {
		if should_commit {
			err := transaction.Commit()
			if err != nil {
				log.Warning("Cannot commit transaction: ", err)
				return err
			}
		} else {
			err := transaction.Rollback()
			if err != nil {
				log.Warning("Cannot roll back transaction: ", err)
				return err
			}
		}
		return nil
	}
	defer final()

	for _, job_summary := range job_summaries {
		err := func() error {
			existing_summary := JobSummary{}
			rows, err := transaction.QueryContext(ctx_timeout, `
			  SELECT job_queue,
				 submitted,
				 pending,
				 runnable,
				 starting,
				 running

		           FROM job_summary_event_log

		           WHERE job_queue = $1
			   ORDER BY timestamp DESC LIMIT 1
			`, job_summary.JobQueue)
			if err != nil {
				log.Error("Cannot select from database: ", err)
				return err
			}
			defer rows.Close()

			ok_to_insert := true
			for rows.Next() {
				err := rows.Scan(&existing_summary.JobQueue, &existing_summary.Submitted, &existing_summary.Pending, &existing_summary.Runnable, &existing_summary.Starting, &existing_summary.Running)
				if err != nil {
					log.Error("Cannot scan from database: ", err)
					return err
				}
				if existing_summary.JobQueue != job_summary.JobQueue {
					ok_to_insert = false
				}

				if existing_summary.Submitted == job_summary.Submitted &&
					existing_summary.Pending == job_summary.Pending &&
					existing_summary.Runnable == job_summary.Runnable &&
					existing_summary.Starting == job_summary.Starting &&
					existing_summary.Running == job_summary.Running {
					ok_to_insert = false
				}
			}

			if ok_to_insert {
				_, err = transaction.ExecContext(ctx_timeout, `
			        INSERT INTO job_summary_event_log
				  ( timestamp,
				    job_queue,
				    submitted,
				    pending,
				    runnable,
				    starting,
				    running )
				VALUES ( now(), $1, $2, $3, $4, $5, $6 )`,
					job_summary.JobQueue,
					job_summary.Submitted,
					job_summary.Pending,
					job_summary.Runnable,
					job_summary.Starting,
					job_summary.Running)
				if err != nil {
					log.Error("Cannot insert into job_summary_event_log: ", err)
					return err
				}
			}
			return nil
		}()
		if err != nil {
			return err
		}
	}

	should_commit = true

	return nil
}

func (pq *postgreSQLStore) UpdateJobLogTerminationRequested(jobID string) error {
	_, err := pq.connection.Exec(`UPDATE jobs SET termination_requested = 't' WHERE job_id = $1`, jobID)
	if err != nil {
		log.Warning("Cannot update job termination requested status: ", err)
	}
	return err
}

func getRowsAsList(rows *sql.Rows) ([]string, error) {
	lst := make([]string, 0)
	for rows.Next() {
		var item string
		if err := rows.Scan(&item); err != nil {
			log.Error("Cannot scan rows: ", err)
			return nil, err
		}
		lst = append(lst, item)
	}
	return lst, nil
}

func (pq *postgreSQLStore) GetStartingStateStuckEC2Instances() ([]string, error) {
	query := `SELECT DISTINCT ta.instance_id FROM jobs j JOIN task_arns_to_instance_info ta ON ta.task_arn = j.task_arn WHERE instance_id is not null AND (now() - last_updated) > '600 seconds' AND status = 'STARTING' AND j.task_arn is not null`

	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Warning("Cannot select jobs that are stuck in STARTING state: ", err)
		return nil, err
	}
	defer rows.Close()

	instances, err := getRowsAsList(rows)
	if err != nil {
		return nil, err
	}
	return instances, nil
}

func (pq *postgreSQLStore) GetAliveEC2Instances() ([]string, error) {
	query := `SELECT DISTINCT instance_id FROM instances WHERE disappeared_at is null`

	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Warning("Cannot select alive EC2 instances from database: ", err)
		return nil, err
	}
	defer rows.Close()

	instances, err := getRowsAsList(rows)
	if err != nil {
		return nil, err
	}
	return instances, nil
}

func (pq *postgreSQLStore) UpdateECSInstances(ec2info map[string]Ec2Info, tasks_per_ec2instance map[string][]string) error {
	alive_instances, err := pq.GetAliveEC2Instances()
	if err != nil {
		return err
	}
	alive_instances_set := make(map[string]bool)
	for _, instance_id := range alive_instances {
		alive_instances_set[instance_id] = true
	}

	transaction, err := pq.connection.Begin()
	if err != nil {
		log.Warning(err)
		return err
	}

	should_commit := false
	final := func() error {
		if should_commit {
			err := transaction.Commit()
			if err != nil {
				log.Warning("Cannot commit transaction: ", err)
				return err
			}
		} else {
			err := transaction.Rollback()
			if err != nil {
				log.Warning("Cannot roll back transaction: ", err)
				return err
			}
		}
		return nil
	}
	defer final()

	query := `insert into instances
	            ( appeared_at
		    , disappeared_at
		    , launched_at
		    , ami
		    , instance_id
		    , instance_type
		    , compute_environment_arn
		    , ecs_cluster_arn
		    , availability_zone
		    , spot_instance_request_id
		    , private_ip_address
		    , public_ip_address )
		    values ( now(), null, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10 )
		    on conflict (instance_id)
		    do update set
		    disappeared_at           = null,
		    launched_at              = $1,
		    appeared_at              = least( now(), instances.appeared_at ),
		    ami                      = $2,
		    instance_type            = $4,
		    compute_environment_arn  = $5,
		    ecs_cluster_arn          = $6,
		    availability_zone        = $7,
		    spot_instance_request_id = $8,
		    private_ip_address       = $9,
		    public_ip_address        = $10
		  `

	for instance_id, instance_info := range ec2info {
		delete(alive_instances_set, instance_id)

		_, err := transaction.Exec(query,
			instance_info.LaunchedAt,
			instance_info.AMI,
			instance_id,
			instance_info.InstanceType,
			instance_info.ComputeEnvironmentARN,
			instance_info.ECSClusterARN,
			instance_info.AvailabilityZone,
			instance_info.SpotInstanceRequestID,
			instance_info.PrivateIP,
			instance_info.PublicIP)
		if err != nil {
			log.Warning("Cannot insert: ", err)
			return err
		}
	}

	for instance_id, tasks := range tasks_per_ec2instance {
		task_json, err := json.Marshal(tasks)
		if err != nil {
			log.Warning("Cannot marshal some JSON: ", tasks)
			return err
		}

		query := `insert into instance_event_log
		            ( timestamp
			    , instance_id
			    , active_jobs )
			    values
			    ( now(), $1, $2 )
			    on conflict do nothing`
		_, err = transaction.Exec(query, instance_id, task_json)
		if err != nil {
			log.Warning("Cannot insert into instance_event_log: ", err)
			return err
		}
	}

	for alive_instance_id, _ := range alive_instances_set {
		query := `update instances set disappeared_at = now() WHERE instance_id = $1`
		_, err := transaction.Exec(query, alive_instance_id)
		if err != nil {
			log.Warning("Cannot update: ", err)
			return err
		}
	}

	should_commit = true
	return nil
}

func (pq *postgreSQLStore) UpdateTaskArnsInstanceIDs(ec2info map[string]Ec2Info, task_ec2_mapping map[string]string) error {
	transaction, err := pq.connection.Begin()
	if err != nil {
		log.Warning(err)
		return err
	}

	should_commit := false
	final := func() error {
		if should_commit {
			err := transaction.Commit()
			if err != nil {
				log.Warning("Cannot commit transaction: ", err)
				return err
			}
		} else {
			err := transaction.Rollback()
			if err != nil {
				log.Warning("Cannot roll back transaction: ", err)
				return err
			}
		}
		return nil
	}
	defer final()

	for task_arn, ec2instance := range task_ec2_mapping {
		ec2_info, ok := ec2info[ec2instance]
		if !ok {
			continue
		}

		query := `
		INSERT INTO task_arns_to_instance_info
		  ( task_arn, instance_id, public_ip, private_ip )
		VALUES ( $1, $2, $3, $4 )
		ON CONFLICT DO NOTHING
		`
		_, err = transaction.Exec(query, task_arn, ec2instance, ec2_info.PublicIP, ec2_info.PrivateIP)
		if err != nil {
			log.Error("Cannot insert into task_arns_to_instance_info: ", err)
			return err
		}
	}

	should_commit = true
	return nil
}

func (pq *postgreSQLStore) GetStatus(jobid string) (*JobStatus, error) {
	rows, err := pq.connection.Query("SELECT status,job_id FROM jobs WHERE job_id = $1", jobid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	found_row := false
	job_status := JobStatus{}
	for rows.Next() {
		err := rows.Scan(&job_status.Status, &job_status.Id)
		if err != nil {
			return nil, err
		}
		found_row = true
	}

	if found_row {
		return &job_status, nil
	} else {
		return nil, nil
	}
}

func (pq *postgreSQLStore) UpdateComputeEnvironmentsLog(ce_lst []ComputeEnvironment) error {
	transaction, err := pq.connection.Begin()
	if err != nil {
		log.Warning(err)
		return err
	}

	should_commit := false
	final := func() error {
		if should_commit {
			err := transaction.Commit()
			if err != nil {
				log.Warning("Cannot commit transaction: ", err)
				return err
			}
		} else {
			err := transaction.Rollback()
			if err != nil {
				log.Warning("Cannot roll back transaction: ", err)
				return err
			}
		}
		return nil
	}
	defer final()

	_, err = transaction.Exec(`set session characteristics as transaction isolation level serializable`)
	if err != nil {
		log.Error("UpdateComputeEnvironmentsLog: cannot set transaction to serializable.", err)
		return err
	}

	for _, ce := range ce_lst {
		err := func() error {
			rows, err := transaction.Query(`
	  SELECT
	    compute_environment,
	    desired_vcpus,
	    max_vcpus,
	    min_vcpus,
	    state,
	    service_role
	    FROM compute_environment_event_log WHERE compute_environment = $1 ORDER BY timestamp DESC LIMIT 1`,
				ce.Name)
			if err != nil {
				log.Warning(err)
				return err
			}
			defer rows.Close()

			ok_to_insert := true
			for rows.Next() {
				ce_existing := ComputeEnvironment{}
				err := rows.Scan(&ce_existing.Name, &ce_existing.WantedvCpus, &ce_existing.MaxvCpus, &ce_existing.MinvCpus, &ce_existing.State, &ce_existing.ServiceRole)
				if err != nil {
					log.Warning(err)
					return err
				}
				if ce_existing.WantedvCpus == ce.WantedvCpus &&
					ce_existing.MaxvCpus == ce.MaxvCpus &&
					ce_existing.MinvCpus == ce.MinvCpus &&
					ce_existing.State == ce.State &&
					ce_existing.ServiceRole == ce.ServiceRole {
					ok_to_insert = false
				}
			}

			if ok_to_insert {
				log.Info("Updating compute environment ", ce.Name)
				_, err = transaction.Exec(`
	  INSERT INTO compute_environment_event_log
	    ( timestamp,
	      compute_environment,
	      desired_vcpus,
	      max_vcpus,
	      min_vcpus,
	      state,
	      service_role )
	    VALUES ( now(), $1, $2, $3, $4, $5, $6 )`,
					ce.Name, ce.WantedvCpus, ce.MaxvCpus, ce.MinvCpus, ce.State, ce.ServiceRole)
				if err != nil {
					log.Warning(err)
					rows.Close()
					return err
				}
			}
			return nil
		}()
		if err != nil {
			return err
		}
	}

	should_commit = true

	return nil
}

func (pq *postgreSQLStore) ActivateJobQueue(job_queue_name string) error {
	ctx_timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	transaction, err := pq.connection.BeginTx(ctx_timeout, &sql.TxOptions{})
	if err != nil {
		log.Warning(err)
		return err
	}
	query := `
	INSERT INTO activated_job_queues ( job_queue ) VALUES ( $1 ) ON CONFLICT DO NOTHING
	`
	_, err = transaction.ExecContext(ctx_timeout, query, job_queue_name)
	if err != nil {
		_ = transaction.Rollback()
		return err
	}

	err = transaction.Commit()
	if err != nil {
		log.Warning("Cannot commit transaction: ", err)
		return err
	}

	return nil
}

func (pq *postgreSQLStore) DeactivateJobQueue(job_queue_name string) error {
	ctx_timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	transaction, err := pq.connection.BeginTx(ctx_timeout, &sql.TxOptions{})
	if err != nil {
		log.Warning(err)
		return err
	}
	query := `
	DELETE FROM activated_job_queues WHERE job_queue = $1
	`
	_, err = transaction.ExecContext(ctx_timeout, query, job_queue_name)
	if err != nil {
		_ = transaction.Rollback()
		return err
	}

	err = transaction.Commit()
	if err != nil {
		log.Warning("Cannot commit transaction: ", err)
		return err
	}

	return nil
}

func (pq *postgreSQLStore) ListActiveJobQueues() ([]string, error) {
	query := `SELECT job_queue FROM activated_job_queues`
	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Error(query, " : failed with error: ", err)
		return nil, err
	}
	defer rows.Close()

	job_queue_names := make([]string, 0)

	for rows.Next() {
		job_queue_name := ""
		err := rows.Scan(&job_queue_name)
		if err != nil {
			log.Error(err)
			return nil, err
		}

		job_queue_names = append(job_queue_names, job_queue_name)
	}

	return job_queue_names, nil
}

func (pq *postgreSQLStore) ListForcedScalingJobQueues() ([]string, error) {
	query := `SELECT job_queue FROM activated_job_queues WHERE forced_scaling`
	rows, err := pq.connection.Query(query)
	if err != nil {
		log.Error(query, " : failed with error: ", err)
		return nil, err
	}
	defer rows.Close()

	job_queue_names := make([]string, 0)

	for rows.Next() {
		job_queue_name := ""
		err := rows.Scan(&job_queue_name)
		if err != nil {
			log.Error(err)
			return nil, err
		}

		job_queue_names = append(job_queue_names, job_queue_name)
	}

	return job_queue_names, nil
}

func (pq *postgreSQLStore) flushJobStatusSubscriptions() error {
	// Sends status update to every subscription that have subscribed to job
	// statuses, that have a job that's had an update.

	job_ids := make([]string, 0)

	ctx_timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := func() error {
		tx, err := pq.connection.BeginTx(ctx_timeout, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
		if err != nil {
			log.Warning("Cannot get job statuses for notification purposes from database: ", err)
			return err
		}
		should_commit := false
		final := func() error {
			if should_commit {
				err := tx.Commit()
				if err != nil {
					log.Warning("Cannot commit transaction: ", err)
					return err
				}
			} else {
				err := tx.Rollback()
				if err != nil {
					log.Warning("Cannot roll back transaction: ", err)
					return err
				}
			}
			return nil
		}
		defer final()

		query := `SELECT job_id FROM job_status_events`
		rows, err := tx.QueryContext(ctx_timeout, query)
		if err != nil {
			log.Warning("Cannot get updated job IDs for the purposes of notifying subscribers: ", err)
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var jobID string
			if err := rows.Scan(&jobID); err != nil {
				log.Warning("Cannot scan jobIDs from job_status_events: ", err)
				return err
			}
			job_ids = append(job_ids, jobID)
		}

		_, err = tx.ExecContext(ctx_timeout, `DELETE FROM job_status_events`)
		if err != nil {
			log.Warning("Cannot delete from job_status_events: ", err)
			return err
		}
		should_commit = true
		return nil
	}()

	if err != nil {
		return err
	}

	job_statuses := make([]Job, 0)
	for _, job_id := range job_ids {
		var job *Job
		job, err := pq.FindOne(job_id)
		if err != nil {
			log.Warning("Cannot find job ", job_id, ": ", err)
			// It can be normal not to find the job so we just log it and move on
			continue
		}
		job_statuses = append(job_statuses, *job)
	}

	// At this point, we've flushed the database but next we need to tell
	// all the subscribers about the events.
	{
		pq.jobStatusSubscribersLock.Lock()
		defer pq.jobStatusSubscribersLock.Unlock()
		for _, job_status := range job_statuses {
			channels, ok := pq.jobStatusSubscribers[job_status.Id]
			if !ok {
				continue
			}
			for _, channel := range channels {
				channel <- job_status
			}
		}
	}

	return nil
}

func (pq *postgreSQLStore) SubscribeToJobStatus(jobID string) (<-chan Job, func()) {
	// Subscribe to a job status. Returns a channel where new job events will
	// be sent and a function unsubscribes from the subscription.
	// It's important to use the unsubscriber function or memory will leak.

	pq.jobStatusSubscribersLock.Lock()
	defer pq.jobStatusSubscribersLock.Unlock()

	existing_subscribers, ok := pq.jobStatusSubscribers[jobID]
	if !ok {
		existing_subscribers = make([]chan<- Job, 0)
	}

	// Channels won't be sent more than ~5 things over its
	// lifetime. We set capacity at 20 here.
	status_channel := make(chan Job, 20)
	existing_subscribers = append(existing_subscribers, status_channel)

	// This function here undoes the subscription.
	unsubscribe := func() {
		pq.jobStatusSubscribersLock.Lock()
		defer pq.jobStatusSubscribersLock.Unlock()
		existing_subscribers, ok := pq.jobStatusSubscribers[jobID]
		if !ok {
			return
		}
		// Make new subscribers list, but without the channel that is
		// being unsubscribed.  A bit slow (we are creating an entirely
		// new list) but usually there is only 1 subscriber anyway.
		new_subscribers := make([]chan<- Job, 0)
		for _, channel := range existing_subscribers {
			if channel != status_channel {
				new_subscribers = append(new_subscribers, channel)
			}
		}

		// If the new subscribers would be empty, delete the key. Let's
		// not have our map grow in terms of number of keys infinitely.
		if len(new_subscribers) == 0 {
			delete(pq.jobStatusSubscribers, jobID)
		} else {
			pq.jobStatusSubscribers[jobID] = new_subscribers
		}

		log.Info("Subscription deregistered for job id: ", jobID, ", total number of job IDs monitored: ", len(pq.jobStatusSubscribers))
	}

	pq.jobStatusSubscribers[jobID] = existing_subscribers
	log.Info("Subscription registered for job id: ", jobID, ", total number of job IDs monitored: ", len(pq.jobStatusSubscribers))

	return status_channel, unsubscribe
}

func NewPostgreSQLStore(databaseHost string, databasePort int, databaseUsername string, databaseName string, databasePassword string) (FinderStorer, error) {
	db, err := sql.Open("postgres", fmt.Sprintf("user=%s dbname=%s host=%s port=%d sslmode=disable password=%s", databaseUsername, databaseName, databaseHost, databasePort, databasePassword))
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(500)

	// sql.Open does not seem to exit early if anything failed with connection.
	// We run one query we expect to succeed
	rows, err := db.Query("SELECT * FROM pg_tables LIMIT 0")
	if err != nil {
		return nil, err
	}
	rows.Close()

	ret := postgreSQLStore{
		connection:               db,
		jobStatusSubscribers:     make(map[string][]chan<- Job),
		jobStatusSubscribersLock: sync.Mutex{},
	}

	return &ret, nil
}
