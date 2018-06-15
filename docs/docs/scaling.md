Batchiepatchie - Scaling hack
-----------------------------

Batchiepatchie has a crude hack that can force the scaling up of AWS Batch
compute environments based on number of jobs in a job queue.

It works by adjusting the minimum cpu count on a compute environment
periodically. This forces AWS Batch to scale up instances instantly up to the
amount requested.

This feature has no exposed UI component so if you want to make use of it, you
must set it manually.

1. Log in to Batchiepatchie PostgreSQL database
2. Modify `activated_job_queues` table; you need to set `forced_scaling` to true for any job queues you want to use for scaling hack.

The following line executed in `psql` would set this behavior to all job queues:

```psql
    UPDATE activated_job_queues SET forced_scaling = 't';
```

#### Caveats

  * If someone in UI deactivates and then re-activates a job queue, the setting
    becomes reset and no scaling will occur.

  * The scaling is done on compute environments, yet the setting is set on job queues.
    If two job queues are attached to some compute environment but only one of them has
    `forced_scaling=t`, then the scaling will only take into account the jobs on one of the
    job queues.

  * Scaling is not supported for job queues that are attached to multiple compute environments.

  * The scaling only works on managed AWS Batch compute environments. It does nothing if
    the attached compute environment is unmanaged.

Due to the fragile nature of this feature, it is, by default, disabled and out
of sight. In the future, we may remove this functionality.
