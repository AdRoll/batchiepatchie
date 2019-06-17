Batchiepatchie - Quick start
============================

This page describes how to quickly get Batchiepatchie running.

The process here is based on `docker-compose` tool that brings up necessary
infrastructure locally. This is useful for development purposes but also to
evaluate and test Batchiepatchie itself. For actual production deployment
instructions, see [documentation on deployment page](deployment.md).

Prerequisities
--------------

You will need to set up some AWS Batch infrastructure or Batchiepatchie will
not show anything. For this, we suggest you follow the ["Getting Started" guide
on AWS Batch on AWS
documentation](https://docs.aws.amazon.com/batch/latest/userguide/Batch_GetStarted.html).

Aside from that, all you need is a working Docker and `docker-compose` tool.
Docker Compose is usually installed with `docker` on most systems. Follow the
instructions for your operating system to install these tools.

Setting up
----------

The machine you are running Batchiepatchie needs to have AWS credentials
available in some way. If you are running the docker on an EC2 instance, you
are likely already good to go as Batchiepatchie can use IAM metadata service to
obtain credentials. Otherwise, you need to pass credentials to the Docker
Compose. Our `docker-compose.yml` file passes environment variables
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as environment variables to the
Batchiepatchie container so if you have these variables set up on your host
system, the credentials should be passed correctly. Be aware that this is
something of [a security
issue](https://diogomonica.com/2017/03/27/why-you-shouldnt-use-env-variables-for-secret-data/)
so we recommend that you do not use `docker-compose.yml` for actual deploys.

Assuming that you have `docker` and `docker-compose` installed and usable,
along with some AWS credentials, you can start Batchiepatchie:

    $ docker-compose up

This will take a few minutes for the first run. The docker-compose will run 4 containers in total:

  * A frontend container, designed for frontend development. This will listen on http://127.0.0.1:8080/

  * An API container, this runs the Batchiepatchie backend. This will listen on http://127.0.0.1:5454/ but you should use the 8080 endpoint instead.

  * A migration container. This only runs once in the beginning of Docker Compose phase to set up the database schema for PostgreSQL database used by Batchiepatchie.

  * A PostgreSQL container that runs a database used by Batchiepatchie.

If everything went without errors, you should be able to access Batchiepatchie
frontend at http://127.0.0.1:8080/. This setup is also designed to be used for
development so modifying any code should automatically rebuild and reload
Batchiepatchie. Docker Compose will mount the current directory from host
inside the container so the containers use the files from host.

Adding job queues
-----------------

When you first start Batchiepatchie, there are jobs to be listed. If you have
followed the prerequisites section on this page, you should have some AWS Batch
infrastructure set up.

You will need to manually add job queues to the system. This is easy; navigate
to "Job queues" tab on Batchiepatchie UI and click "ACTIVATE" on some of the
job queues (you need to set up some job queues with AWS Batch first before they
appear in Batchiepatchie).

Another way to do this is to manually log into the PostgreSQL database and add
your queue:

    $ docker exec -it batchiepatchie_postgres_1 sh -c 'psql --user postgres --dbname postgres'
    postgres=# INSERT INTO activated_job_queues VALUES ( 'name-of-your-job-queue' );
    INSERT 0 1
    postgres=# SELECT * FROM activated_job_queues;
     job_queue
    -----------
     name-of-your-job-queue
    (1 row)

    postgres=#

Once your job queue is inserted, Batchiepatchie will periodically poll AWS
Batch to update its understanding of current state of batch jobs.
