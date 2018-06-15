-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE compute_environment_event_log (
    timestamp           timestamp with time zone NOT NULL,
    compute_environment TEXT NOT NULL,
    desired_vcpus       INTEGER,
    max_vcpus           INTEGER,
    min_vcpus           INTEGER,
    state               TEXT,
    service_role        TEXT
);

CREATE INDEX compute_environment_event_log_timestamp ON compute_environment_event_log (timestamp);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX compute_environment_event_log_timestamp;
DROP TABLE compute_environment_event_log;

