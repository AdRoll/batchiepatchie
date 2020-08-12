Batchiepatchie - Deployment
===========================

This page describes how to deploy Batchiepatchie in production environment. At
the same time, it describes how Batchiepatchie is designed to be run.

Operation
---------

Batchiepatchie works by mirroring the state of AWS Batch in a PostgreSQL
database. Unlike AWS Batch, Batchiepatchie will not forget about historical
jobs (unless we manually delete old jobs from the database).

There are two mechanisms Batchiepatchie can use to mirror its internal state:

  * Batchiepatchie polls periodically for all state from AWS Batch.

  * Batchiepatchie can be called by AWS Lambda function to instantly update state of some job.

Out-of-box, the polling mechanism is enabled and will keep the jobs up to date
in Batchiepatchie's eyes. The AWS Lambda setup is more complicated and is
currently undocumented; we will fix this in the future.

Building
--------

Batchiepatchie is a Go project and if you have Go set up correctly, `go get`
(to get dependencies) and `go build` should be sufficient inside
Batchiepatchie's source code directory.

    $ go get
    $ go build

You should end up with a `batchiepatchie` executable file in the current
directory.

Configuration file
------------------

Batchiepatchie is driven by a configuration file. An example is provided in the
Batchiepatchie repository, called `test.toml`. The contents of this are reproduced below:

```toml
host = "0.0.0.0"
port = 5454
region = "us-west-2"
database_host = "postgres"
database_port = 5432
database_username = "postgres"
database_name = "postgres"
database_password = "123456"
frontend_assets = "local"
frontend_assets_local_prefix = "frontend/dist"
```

We will go through possible settings one by one.

  * `host` and `port`: These define which host and port Batchiepatchie should listen on.
  * `region`: This specifies which AWS region Batchiepatchie should operate in.
  * `database_host`: This describes the hostname to use for PostgreSQL store.
  * `database_port`: This describes the port where to connect for PostgreSQL store.
  * `database_username`: This specifies the username to use for PostgreSQL store.
  * `database_name`: This specifies the database name to use for PostgreSQL store.
  * `database_password`: This specifies the password to use to connect to PostgreSQL store. Mutually exclusive with `password_bucket` and `password_key` settings.
  * `password_bucket` and `password_key`: These specify an S3 bucket and key for an S3 object that contains the password. This way you can store your passwords encrypted in S3. The S3 object should contain a line: `database_password = "<actual password goes here>"`. These settings are mutually exclusive with plain `database_password` setting.
  * `frontend_assets`: This must be either `local` or `s3`. Batchiepatchie needs static files to show its UI and these static files can be stored locally or in S3.
  * `frontend_assets_local_prefix`:  When `frontend_assets` is `local`, this must point to directory where `index.html` is located. Note that Batchiepatchie does not come with pre-built assets; you will need to build them in `frontend/` directory in Batchiepatchie repository first. Refer to [frontend build instructions](frontend.md) for more information.
  * `frontend_assets_bucket`: When `frontend_assets` is `s3`, this must point to the S3 bucket name where static assets are located.
  * `frontend_assets_key`: When `frontend_assets` is `s3, this must point to the key name that contains `index.html` for Batchiepatchie. Batchiepatchie will load this file from S3 at start up. Note that other static files are not loaded through S3.
  * `sync_period`: This specifies the number of seconds between polls with AWS Batch. By default, it is 30 seconds.
  * `scale_period`: This specifies the number of seconds between scaling hack polls. See more information about scaling hack on [this page](scaling). By default, this setting is 30 seconds.

The configuration file is passed when invoking Batchiepatchie.

    $ ./batchiepatchie configuration.toml

The configuration file can also be placed in S3:

    $ ./batchiepatchie s3://my-bucket/configuration.toml

Settings about which job queues to ingest into Batchiepatchie database are not
in the configuration file. These are set into the database instead.

Database
--------

Batchiepatchie requires a PostgreSQL database to store persistent data. We have
tested Batchiepatchie with PostgreSQL 9.6 so we know 9.6 family works. The most
exotic feature Batchiepatchie makes use of is [trigram
indexes](https://www.postgresql.org/docs/9.6/static/pgtrgm.html) and these seem
to have been available since PostgreSQL 9.1. It is possible Batchiepatchie will
work with older PostgreSQL versions, such as 9.1, but we have not tested this.

The database must be initialized with a schema. Batchiepatchie project uses
[goose](https://github.com/pressly/goose) for migrations, and the migrations
are located in `migrations/` directory in Batchiepatchie repository.

If you have credentials to some PostgreSQL repository, you can run migrations
with goose as in the example below:

    $ go get -u github.com/pressly/goose/cmd/goose     # Install goose
    $ cd migrations
    $ goose postgres "user=batchiepatchie dbname=batchiepatchie password=blahblah" up

Once the database has been initialized with the proper schema, Batchiepatchie
can be started.

IAM policies
------------

During its operation, Batchiepatchie makes various AWS calls and thus, requires
permissions to do these operations. Below is a list of permissions
Batchiepatchie needs:

### Essential permissions:

    batch:DescribeJobs
    batch:DescribeJobQueues
    batch:DescribeComputeEnvironments
    batch:ListJobs
    batch:TerminateJob
    ec2:DescribeInstances
    ecs:DescribeContainerInstances
    ecs:DescribeTasks
    ecs:ListContainerInstances
    ecs:ListTasks
    logs:DescribeLogStreams
    logs:GetLogEvents

Aside from `batch:TerminateJob`, the essential permissions are all about
fetching information from AWS.

### Optional permissions:
    
    batch:UpdateComputeEnvironment
    ec2:TerminateInstances
    s3:GetObject

S3 permissions are required if you place any configuration to S3; Batchiepatchie needs to be able to fetch it.

If you want to use the [scaling hack feature](scaling.md) of Batchiepatchie, you will need
to let it modify compute environments with `batch:UpdateComputeEnvironment`.

If you want to use the [terminate instance hack feature](terminator.md) of
Batchiepatchie, you will need to give it permission to terminate instances.
