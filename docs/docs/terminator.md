Batchiepatchie - Terminator
---------------------------

Batchiepatchie can terminate EC2 instances that look like they've got stuck.

At this time, Batchiepatchie will terminate EC2 instances that have jobs on
them that have been in `STARTING` state for more than 10 minutes. This is a bug
that occasionally happens with AWS Batch.

This feature is by default turned off but can be enabled by specifying
`kill_stuck_jobs = true` in the Batchiepatchie configuration file. The behavior
will be exercised on all jobs Batchiepatchie knows about.

Batchiepatchie requires `ec2:TerminateInstances` to be able to invoke
termination on instances.
