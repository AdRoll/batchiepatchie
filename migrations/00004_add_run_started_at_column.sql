-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE jobs ADD COLUMN run_started_at timestamp with time zone;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE jobs DROP COLUMN run_started_at;

