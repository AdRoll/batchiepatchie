-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE jobs ADD COLUMN log_stream_name TEXT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE jobs DROP COLUMN log_stream_name;

