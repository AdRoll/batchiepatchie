-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX job_queue_timestamp_jobs ON jobs (job_queue, last_updated);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX job_queue_timestamp_jobs;
