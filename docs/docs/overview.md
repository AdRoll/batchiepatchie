Batchiepatchie - Overview
=========================

Batchiepatchie is a monitoring tool for AWS Batch. It is written in the Go
language.

AWS Batch is a service, provided by Amazon Web Services, that runs docker
containers on EC2 instances. Typically, these EC2 instances are brought up when
batch jobs are submitted and scaled down when there are no jobs to run. On high
level, you tell AWS Batch "Please run my docker container located at URL X,
with N cpus and M gigabytes of memory" and AWS Batch will figure it out.
Detailed documentation on AWS Batch can be found on [their
website](https://aws.amazon.com/documentation/batch/).

Batchiepatchie exists because the user interface on Amazon's own dashboard leaves
certain things to be desired. In particular, Batchiepatchie strives to make the following
use cases easier:

  * Find currently running and historical jobs very quickly among thousands of other jobs.

  * Find and read the logs of any job without having to navigate through a complicated UI.

  * Work around some quirks in AWS Batch itself.

  * Implement timeouts for AWS Batch jobs.

  * Collect historical information about jobs.

  * Make it easy to cancel jobs en-masse.

Batchiepatchie has a search box that is designed to work fast with free-form
text. Batchiepatchie will also remember jobs forever, so you should be able to
find jobs even from months in the past in seconds.

AWS Batch jobs place standard output and error from jobs into CloudWatch logs.
Batchiepatchie knows how to find these logs and display directly in its web
interface, saving valuable time when you need to read the logs of a batch job.

Batchiepatchie has some features to cancel many jobs at once. This is useful
when someone submits a large distributed job by mistake and it needs to be
killed.

Batchiepatchie collects data about instances and ECS clusters used by batch
jobs in a PostgreSQL database. The data can later be used to analyze the costs
and behaviour of batch jobs.

One major feature of AWS Batch that is not currently properly supported in
Batchiepatchie is array jobs. The parent job will show up but child jobs will
not display properly.
