-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE jobs ADD COLUMN log_group_name TEXT default '/aws/batch/job';

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE jobs DROP COLUMN log_group_name;

