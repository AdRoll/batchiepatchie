-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE INDEX jobs_status ON jobs (status);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX jobs_status;

