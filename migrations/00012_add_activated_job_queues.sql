-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE activated_job_queues (
    job_queue     TEXT NOT NULL PRIMARY KEY
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE activated_job_queues;

