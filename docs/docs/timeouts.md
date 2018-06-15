Batchiepatchie - Timeouts
-------------------------

Batchiepatchie can automatically terminate jobs that have timed out. This is
useful since timeouts are not supported by AWS Batch itself, out-of-box, at
this time.

The timeout support is always turned on but it will only be exercised on jobs
that have set a timeout on themselves.

To have your jobs be automatically terminated by Batchiepatchie if they take
too long, you need to set environment variable `PYBATCH_TIMEOUT` on them.

For example, to specify 1 hour (i.e. 3600 seconds) timeout on a job, you can set:

    PYBATCH_TIMEOUT=3600

In the job definition or job submission for AWS Batch.

When Batchiepatchie is polling for jobs, if it sees any jobs that were
_submitted_ to AWS Batch more than `PYBATCH_TIMEOUT` seconds ago, it will
invoke `batch:TerminateJobs` on them.

Be aware that in some cases, `batch:TerminateJobs` is not sufficient to
actually kill a job. However, it is the best Batchiepatchie can do. Jobs that
have had `batch:TerminateJobs` called on them will appear in red color on job
listing. When the jobs get killed, they'll either appear as `FAILED` or
`TERMINATED`.

Historical note
---------------

The name "PYBATCH" comes from an internal library used at AdRoll, where
`pybatch` is a name of a Python library that submits jobs to AWS Batch. This
library had its own concept of timeouts and later this was propagated to
Batchiepatchie.
