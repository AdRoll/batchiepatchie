-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE instances (
    appeared_at              timestamp with time zone NOT NULL,
    disappeared_at           timestamp with time zone,
    launched_at              timestamp with time zone,
    ami                      TEXT NOT NULL,
    instance_id              TEXT NOT NULL PRIMARY KEY,
    instance_type            TEXT NOT NULL,
    compute_environment_arn  TEXT NOT NULL,
    ecs_cluster_arn          TEXT NOT NULL,
    availability_zone        TEXT NOT NULL,
    spot_instance_request_id TEXT,
    private_ip_address       TEXT,
    public_ip_address        TEXT
);

CREATE TABLE instance_event_log (
    timestamp                timestamp with time zone NOT NULL,
    instance_id              TEXT NOT NULL,
    active_jobs              JSONB NOT NULL,
    PRIMARY KEY(timestamp, instance_id)
);

CREATE INDEX instances_disappeared_at ON instances (disappeared_at);
CREATE INDEX instances_launched_at ON instances (launched_at);
CREATE INDEX instances_appeared_at ON instances (appeared_at);
CREATE INDEX instance_event_log_instance_id ON instance_event_log (instance_id);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP INDEX instances_appeared_at;
DROP INDEX instance_event_log_instance_id;
DROP INDEX instances_disappeared_at;
DROP INDEX instances_launched_at;
DROP TABLE instance_event_log;
DROP TABLE instances;

