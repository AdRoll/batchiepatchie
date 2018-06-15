-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE job_summary_event_log (
    timestamp             timestamp with time zone NOT NULL,
    job_queue             TEXT NOT NULL,
    submitted             INTEGER NOT NULL,
    pending               INTEGER NOT NULL,
    runnable              INTEGER NOT NULL,
    starting              INTEGER NOT NULL,
    running               INTEGER NOT NULL
);

CREATE INDEX job_summary_event_log_timestamp ON job_summary_event_log (timestamp);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX job_summary_event_log_timestamp;
DROP TABLE job_summary_event_log;

