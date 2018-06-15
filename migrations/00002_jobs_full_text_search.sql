-- +goose Up
-- SQL in this section is executed when the migration is applied.

-- add a column to store the searchable info for jobs.
ALTER TABLE jobs ADD COLUMN weighted_search_vector tsvector;

-- updates all job entries with the searchable information;
UPDATE jobs SET
    weighted_search_vector = x.weighted_tsv
FROM (
    SELECT job_id,
      to_tsvector(jobs.job_id) ||
      to_tsvector(jobs.job_name) ||
		  to_tsvector(jobs.job_definition) ||
		  to_tsvector(jobs.job_queue) ||
		  to_tsvector(jobs.image) ||
      to_tsvector(jobs.command_line) AS weighted_tsv
     FROM jobs
) AS x
WHERE x.job_id = jobs.job_id;

-- a trigger to generate searchable information for each new entry.
-- +goose StatementBegin
CREATE FUNCTION jobs_weighted_search_vector_trigger() RETURNS trigger AS $$
begin
  new.weighted_search_vector :=
		   to_tsvector(new.job_id) ||
		   to_tsvector(new.job_name) ||
		   to_tsvector(new.job_definition) ||
		   to_tsvector(new.job_queue) ||
		   to_tsvector(new.image) ||
       to_tsvector(new.command_line);
  return new;
end;
$$
LANGUAGE plpgsql;
-- +goose StatementEnd

-- use the function as a trigger.
CREATE TRIGGER jobs_update_tsvector BEFORE INSERT OR UPDATE
ON jobs
FOR EACH ROW EXECUTE PROCEDURE jobs_weighted_search_vector_trigger();

-- create an index for the jobs search info.
CREATE INDEX jobs_weighted_sv_idx ON jobs USING GIST(weighted_search_vector);


-- +goose Down
-- SQL in this section is executed when the migration is rolled back.

DROP INDEX jobs_weighted_sv_idx;
DROP TRIGGER jobs_update_tsvector on jobs;
DROP FUNCTION jobs_weighted_search_vector_trigger CASCADE;
ALTER TABLE jobs DROP COLUMN weighted_search_vector;
