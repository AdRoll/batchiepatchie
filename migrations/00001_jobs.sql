-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE jobs (
    job_id           CHAR(36)  NOT NULL PRIMARY KEY,
    job_name         TEXT NOT NULL,
    job_definition   TEXT NOT NULL,
    job_queue        TEXT NOT NULL,
    image            TEXT NOT NULL,
    status           VARCHAR(9) NOT NULL,
    created_at       timestamp with time zone NOT NULL,
    stopped_at       timestamp with time zone,
    vcpus            INTEGER NOT NULL,
    memory           INTEGER NOT NULL,
    timeout          INTEGER,
    command_line     TEXT NOT NULL,
    last_updated     timestamp with time zone NOT NULL
);

CREATE INDEX jobs_created_at_timestamp ON jobs (created_at);
CREATE INDEX jobs_stopped_at_timestamp ON jobs (stopped_at);
CREATE INDEX jobs_last_updated_timestamp ON jobs (last_updated);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX jobs_created_at_timestamp;
DROP INDEX jobs_stopped_at_timestamp;
DROP INDEX jobs_last_updated_timestamp;
DROP TABLE jobs;

