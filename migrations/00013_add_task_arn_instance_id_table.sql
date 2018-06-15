-- +goose Up
-- SQL in this section is executed when the migration is applied.

CREATE TABLE task_arns_to_instance_info (
    task_arn     TEXT NOT NULL,
    instance_id  TEXT NOT NULL,
    public_ip    TEXT NOT NULL,
    private_ip   TEXT NOT NULL,
    PRIMARY KEY(task_arn, instance_id)
);

CREATE INDEX task_arns_task_arns ON task_arns_to_instance_info (task_arn);
CREATE INDEX task_arns_instance_id ON task_arns_to_instance_info (instance_id);

ALTER TABLE jobs ADD COLUMN task_arn TEXT;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
ALTER TABLE jobs DROP COLUMN task_arn;

DROP INDEX task_arns_task_arns;
DROP INDEX task_arns_instance_id;
DROP TABLE task_arns_to_instance_info;

