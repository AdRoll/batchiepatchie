-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE jobs ALTER COLUMN job_id TYPE VARCHAR(44);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE jobs ALTER COLUMN job_id TYPE VARCHAR(36);
