-- +goose Up
-- SQL in this section is executed when the migration is applied.

ALTER TABLE jobs ADD COLUMN array_properties JSONB;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

ALTER TABLE jobs DROP COLUMN array_properties;
