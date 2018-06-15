-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE jobs ADD COLUMN status_reason TEXT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE jobs DROP COLUMN status_reason;

