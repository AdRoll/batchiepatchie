-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- Have to change to VARCHAR so gin index works
ALTER TABLE jobs DROP CONSTRAINT jobs_pkey;
ALTER TABLE jobs ALTER COLUMN job_id TYPE VARCHAR(36);
ALTER TABLE jobs ADD PRIMARY KEY (job_id);

CREATE EXTENSION pg_trgm;

CREATE INDEX trgm_idx_jobs_job_id ON jobs USING gin (job_id gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_name ON jobs USING gin (job_name gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_queue ON jobs USING gin (job_queue gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_image ON jobs USING gin (image gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_command_line ON jobs USING gin (command_line gin_trgm_ops);
CREATE INDEX trgm_idx_jobs_job_definition ON jobs USING gin (job_definition gin_trgm_ops);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX trgm_idx_jobs_job_id;
DROP INDEX trgm_idx_jobs_job_name;
DROP INDEX trgm_idx_jobs_job_queue;
DROP INDEX trgm_idx_jobs_image;
DROP INDEX trgm_idx_jobs_command_line;
DROP INDEX trgm_idx_jobs_job_definition;

DROP EXTENSION pg_trgm;

ALTER TABLE jobs DROP CONSTRAINT jobs_pkey;
ALTER TABLE jobs ALTER COLUMN job_id TYPE CHAR(36);
ALTER TABLE jobs ADD PRIMARY KEY (job_id);