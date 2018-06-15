Batchiepatchie - Job statuses
-----------------------------

Batchiepatchie can show 8 different statuses for a job.

  * Submitted
  * Pending
  * Runnable
  * Running
  * Succeeded
  * Failed
  * Gone
  * Terminated

Of these, first 6 correspond to [AWS Batch job
states](https://docs.aws.amazon.com/batch/latest/userguide/job_states.html).

The last two, `GONE` and `TERMINATED` are Batchiepatchie-specific.

  * `GONE`: This means Batchiepatchie lost track of a job. There is no information if the job
    has succeeded or failed. A large number of jobs with `GONE` status can indicate problems
    with Batchiepatchie or AWS Batch setup but by itself it is harmless.

  * `TERMINATED`: This is the same as `FAILED` but if the job exit code
    indicates `SIGKILL` type of exit, then instead of `FAILED`, we display the
    text `TERMINATED`. This often means the job was killed by "Terminate job"
    button, timeouts or out of memory.

