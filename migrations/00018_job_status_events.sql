-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE job_status_events (
    job_id     CHAR(36) NOT NULL PRIMARY KEY,
    updated    timestamp with time zone NOT NULL
);

-- +goose StatementBegin
CREATE FUNCTION job_status_update_update() RETURNS trigger AS
$body$
BEGIN
    IF NEW.status <> OLD.status THEN
        INSERT INTO job_status_events ( job_id, updated ) VALUES ( NEW.job_id, now() ) ON CONFLICT ( job_id ) DO UPDATE SET updated = now();
    END IF;
    RETURN NEW;
END;
$body$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION job_status_update_insert() RETURNS trigger AS
$body$
BEGIN
    INSERT INTO job_status_events ( job_id, updated ) VALUES ( NEW.job_id, now() ) ON CONFLICT ( job_id ) DO UPDATE SET updated = now();
    RETURN NEW;
END;
$body$ LANGUAGE plpgsql;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER job_status_update_trigger_insert
  AFTER
  INSERT
  ON jobs
  FOR EACH ROW
  EXECUTE PROCEDURE job_status_update_insert();
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TRIGGER job_status_update_trigger_update
  AFTER
  UPDATE
  ON jobs
  FOR EACH ROW
  EXECUTE PROCEDURE job_status_update_update();
-- +goose StatementEnd

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TRIGGER job_status_update_trigger_insert ON jobs;
DROP TRIGGER job_status_update_trigger_update ON jobs;
DROP FUNCTION job_status_update_update();
DROP FUNCTION job_status_update_insert();
DROP TABLE job_status_events;

