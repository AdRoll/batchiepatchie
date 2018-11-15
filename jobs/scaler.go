package jobs

import (
	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
)

func ScaleComputeEnvironments(storer Storer, queues []string) {
	span := opentracing.StartSpan("ScaleComputeEnvironments")
	defer span.Finish()

	// Don't bother going to database if we have no queues.
	if len(queues) == 0 {
		return
	}

	running_loads, err := storer.EstimateRunningLoadByJobQueue(queues)
	if err != nil {
		log.Warning("Aborting compute environment scaling due to errors with store.")
		return
	}

	/* What happens here is that we look at what the current "desired"
	* vcpus and memory are and if they are lower than our estimate, we
	* manually bump it up. AWS Batch isn't very aggressive about the
	* scaling.
	*
	* We can assume AWS Batch will manually scale that stuff down later if needed.
	 */

	job_queue_names := make([]*string, 0)
	for job_queue, _ := range running_loads {
		jq := job_queue
		job_queue_names = append(job_queue_names, &jq)
	}

	job_queues := &batch.DescribeJobQueuesInput{
		JobQueues: job_queue_names,
	}

	job_queue_descs, err := awsclients.Batch.DescribeJobQueues(job_queues)
	if err != nil {
		log.Warning("Failed to describe job queues: ", err)
		return
	}

	job_queue_descs_map := make(map[string]*batch.JobQueueDetail)
	for _, job_queue_desc := range job_queue_descs.JobQueues {
		job_queue_descs_map[*job_queue_desc.JobQueueName] = job_queue_desc
	}

	wanted_vcpus_by_ce := make(map[string]int64)
	for job_queue, load := range running_loads {
		desc, ok := job_queue_descs_map[job_queue]
		if ok != true {
			log.Info("Cannot find information for job queue ", job_queue, " so won't do any scaling for it.")
			continue
		}

		// job_queue must be in one of our active job queues
		ok = false
		for _, job_queue_allowed := range queues {
			if job_queue == job_queue_allowed {
				ok = true
				break
			}
		}
		if !ok {
			continue
		}

		for _, ce := range desc.ComputeEnvironmentOrder {
			ce_name := ce.ComputeEnvironment
			old_vcpus, ok := wanted_vcpus_by_ce[*ce_name]
			if ok {
				wanted_vcpus_by_ce[*ce_name] = old_vcpus + load.WantedVCpus
			} else {
				wanted_vcpus_by_ce[*ce_name] = load.WantedVCpus
			}
			// Stop wanting CPUs in more than one compute environment in job queue.
			// TODO: somehow distribute load to more than one compute environment instead of stopping here.
			break
		}
	}

	for ce, wanted := range wanted_vcpus_by_ce {
		log.Info("Wanted vcpus in compute environment ", ce, ": ", wanted)

		ces := make([]*string, 1)
		ces[0] = &ce
		out, err := awsclients.Batch.DescribeComputeEnvironments(&batch.DescribeComputeEnvironmentsInput{
			ComputeEnvironments: ces,
		})
		if err != nil {
			log.Warning("DescribeComputeEnvironments failed on compute environment ", ce, ": ", err)
			continue
		}

		if len(out.ComputeEnvironments) != 1 {
			log.Warning("Skipping compute environment ", ce, ", no information from DescribeComputeEnvironments")
			continue
		}

		detail := out.ComputeEnvironments[0]
		if detail.Status == nil || detail.State == nil || *detail.Status != "VALID" || *detail.State != "ENABLED" || detail.ComputeResources == nil {
			log.Warning("Not scaling ", ce, " because it's not both VALID and ENABLED.")
			continue
		}

		if detail.ComputeResources.DesiredvCpus == nil {
			// I'm not sure if AWS Batch would actually return nil here ever but it's allowed by types :shruggie:
			// Let's not crash if it's nil for whatever reason
			log.Warning("Not scaling ", ce, " because it has no desired vcpus set.")
			continue
		}
		if detail.ComputeResources.MaxvCpus == nil {
			log.Warning("Not scaling ", ce, " because it has no maximum vcpus set.")
			continue
		}

		batch_min_vcpus := *detail.ComputeResources.MinvCpus
		batch_max_vcpus := *detail.ComputeResources.MaxvCpus

		wanted := wanted
		if wanted > batch_max_vcpus {
			wanted = batch_max_vcpus
		}

		update_resources := batch.ComputeResourceUpdate{
			MinvCpus: &wanted,
		}

		// Now for the meat...if the desired vcpus is lower than we would like, we scale up.
		if wanted != batch_min_vcpus {
			_, err := awsclients.Batch.UpdateComputeEnvironment(&batch.UpdateComputeEnvironmentInput{
				ComputeEnvironment: &ce,
				ComputeResources:   &update_resources,
			})
			if err != nil {
				log.Error("Tried to scale ", ce, " but it failed: ", err)
				continue
			}
			log.Info("Updated job queue min vcpus in ", ce, " from ", batch_min_vcpus, " to ", wanted)
		}
	}
}
