-- +goose Up
-- SQL in this section is executed when the migration is applied.
DROP INDEX trgm_idx_jobs_job_id;
DROP INDEX trgm_idx_jobs_job_name;
DROP INDEX trgm_idx_jobs_job_queue;
DROP INDEX trgm_idx_jobs_image;
DROP INDEX trgm_idx_jobs_command_line;
DROP INDEX trgm_idx_jobs_job_definition;

CREATE INDEX trgm_idx_jobs ON jobs USING gin (
    job_id gin_trgm_ops,
    job_name gin_trgm_ops,
    job_queue gin_trgm_ops,
    image gin_trgm_ops,
    command_line gin_trgm_ops,
    job_definition gin_trgm_ops
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX trgm_idx_jobs;

CREATE INDEX trgm_idx_jobs_job_id ON jobs USING gin (job_id gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_name ON jobs USING gin (job_name gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_queue ON jobs USING gin (job_queue gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_image ON jobs USING gin (image gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_command_line ON jobs USING gin (command_line gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_definition ON jobs USING gin (job_definition gin_trgm_ops);