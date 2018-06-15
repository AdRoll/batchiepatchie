-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE activated_job_queues
  ADD COLUMN forced_scaling BOOLEAN NOT NULL DEFAULT 'f';


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE activated_job_queues
  DROP COLUMN forced_scaling;
