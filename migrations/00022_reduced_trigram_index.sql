-- +goose Up
-- SQL in this section is executed when the migration is applied.
DROP INDEX trgm_idx_jobs;

CREATE INDEX trgm_idx_jobs ON jobs USING gin (
    (job_id || job_name || job_queue || image) gin_trgm_ops
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX trgm_idx_jobs;

CREATE INDEX trgm_idx_jobs ON jobs USING gin (
    (job_id || job_name || job_queue || image || command_line || job_definition) gin_trgm_ops
);
