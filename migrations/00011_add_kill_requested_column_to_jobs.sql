-- +goose Up
-- SQL in this section is executed when the migration is applied.
ALTER TABLE jobs ADD COLUMN termination_requested BOOLEAN NOT NULL DEFAULT 'f';
-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE jobs DROP COLUMN termination_requested;

