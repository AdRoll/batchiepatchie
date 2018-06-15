-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX compute_environment_event_log_compute_environment ON compute_environment_event_log (compute_environment, timestamp);
CREATE INDEX job_summary_event_log_job_queue ON job_summary_event_log (job_queue, timestamp);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX job_summary_event_log_job_queue;
DROP INDEX compute_environment_event_log_compute_environment;

