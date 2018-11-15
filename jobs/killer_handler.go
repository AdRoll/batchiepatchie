package jobs

import (
	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
)

type KillerHandler struct {
}

func (th *KillerHandler) KillOne(jobID string, reason string, store Storer) error {
	span := opentracing.StartSpan("KillOne")
	defer span.Finish()

	input := &batch.TerminateJobInput{
		JobId:  aws.String(jobID),
		Reason: aws.String("Cancelled job from batchiepatchie: " + reason),
	}

	log.Info("Killing Job ", jobID, "...")
	_, err := awsclients.Batch.TerminateJob(input)
	if err != nil {
		log.Warning("Killing job failed: ", err)
		return err
	}

	store.UpdateJobLogTerminationRequested(jobID)

	return nil
}

func (th *KillerHandler) KillInstances(instances []string) error {
	span := opentracing.StartSpan("KillInstances")
	defer span.Finish()

	// Exit early if there are no instances to kill
	if len(instances) == 0 {
		return nil
	}
	/* While the terminate instances accepts batches, we deliberately call
	* it one instance at a time. The API call won't terminate anything if
	* even one of the instance IDs is wrong but we still do want to
	* terminate the others.

	 This shouldn't be too inefficient since most of the time there's only
	 one or two instances to terminate this way anyway. */

	var final_ret error

	for _, instance_id := range instances {
		instances_ptr := make([]*string, 1)
		instances_ptr[0] = &instance_id
		terminate_instances := &ec2.TerminateInstancesInput{
			InstanceIds: instances_ptr,
		}
		_, err := awsclients.EC2.TerminateInstances(terminate_instances)
		if err != nil {
			log.Warning("Cannot terminate instance ", instance_id, ": ", err)
			// Don't return early but record the error
			final_ret = err
		}
		log.Info("Terminated instance ", instance_id, " because it has a job at STARTING state stuck.")
	}

	return final_ret
}

func NewKillerHandler() (Killer, error) {
	var ret Killer = new(KillerHandler)
	return ret, nil
}
