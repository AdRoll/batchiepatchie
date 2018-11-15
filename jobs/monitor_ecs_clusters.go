package jobs

import (
	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/aws/aws-sdk-go/service/ecs"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
)

type arnInfo struct {
	ecsClusterARN         string
	computeEnvironmentARN string
}

func MonitorECSClusters(fs Storer, queues []string) error {
	span := opentracing.StartSpan("MonitorECSClusters")
	defer span.Finish()

	/* TODO: handle pagination in all these API calls. */

	/* First we collect all compute environments references by any queues
	* */
	job_queue_names := make([]*string, 0)
	for _, job_queue := range queues {
		jq := job_queue
		job_queue_names = append(job_queue_names, &jq)
	}

	job_queues := &batch.DescribeJobQueuesInput{
		JobQueues: job_queue_names,
	}

	job_queue_descs, err := awsclients.Batch.DescribeJobQueues(job_queues)
	if err != nil {
		log.Warning("Failed to describe job queues: ", err)
		return err
	}

	compute_environments := make(map[string]bool)
	for _, job_queue_desc := range job_queue_descs.JobQueues {
		for _, compute_env_order := range job_queue_desc.ComputeEnvironmentOrder {
			compute_environments[*compute_env_order.ComputeEnvironment] = true
		}
	}

	/* Now that we got compute environments (in the map above), we can get
	* their description and the ECS cluster names they point to. */
	compute_environments_lst := make([]*string, len(compute_environments))
	i := 0
	for name := range compute_environments {
		n := name
		compute_environments_lst[i] = &n
		i++
	}

	compute_environments_input := &batch.DescribeComputeEnvironmentsInput{
		ComputeEnvironments: compute_environments_lst,
	}

	compute_environment_descs, err := awsclients.Batch.DescribeComputeEnvironments(compute_environments_input)
	if err != nil {
		log.Warning("Failed to describe compute environments: ", err)
		return err
	}

	ecs_clusters := make(map[string]string)
	for _, compute_environment_desc := range compute_environment_descs.ComputeEnvironments {
		if compute_environment_desc.EcsClusterArn != nil {
			ecs_clusters[*compute_environment_desc.EcsClusterArn] = *compute_environment_desc.ComputeEnvironmentArn
		}
	}

	ecs_clusters_lst := make([]*string, len(ecs_clusters))
	i = 0

	task_ec2_mapping := make(map[string]string)
	ec2instances_set := make(map[string]arnInfo)
	tasks_per_ec2instance := make(map[string][]string)

	for name := range ecs_clusters {
		n := name
		ecs_clusters_lst[i] = &n
		i++

		task_mapping := make(map[string]string)
		var next_token *string
		for {
			var tasks_input *ecs.ListTasksInput
			if next_token == nil {
				tasks_input = &ecs.ListTasksInput{
					Cluster: &n,
				}
			} else {
				tasks_input = &ecs.ListTasksInput{
					Cluster:   &n,
					NextToken: next_token,
				}
			}
			task_listing, err := awsclients.ECS.ListTasks(tasks_input)
			if err != nil {
				log.Warning("Failed to list tasks: ", err)
				return err
			}

			task_arns := make([]*string, 0)
			for _, task := range task_listing.TaskArns {
				n := *task
				task_arns = append(task_arns, &n)
			}

			if len(task_arns) > 0 {
				describe_tasks := &ecs.DescribeTasksInput{
					Cluster: &n,
					Tasks:   task_arns,
				}

				task_descs, err := awsclients.ECS.DescribeTasks(describe_tasks)
				if err != nil {
					log.Warning("Failed to describe tasks: ", err)
					return err
				}

				for _, task_desc := range task_descs.Tasks {
					task_mapping[*task_desc.TaskArn] = *task_desc.ContainerInstanceArn
				}
			}

			next_token = task_listing.NextToken
			if next_token == nil {
				break
			}
		}
		/* task_mapping should now contain mapping from Task ARNs to container instance ARNs.
		   now, figure out the actual instance IDs for those container instance ARNs.

		   We first get all container ARNs by API call and then
		   complement it with the ones we got from tasks. */

		next_token = nil
		container_arn_set := make(map[string]bool, 0)
		for {
			var describe_container_instances *ecs.ListContainerInstancesInput
			if next_token == nil {
				describe_container_instances = &ecs.ListContainerInstancesInput{
					Cluster: &n,
				}
			} else {
				describe_container_instances = &ecs.ListContainerInstancesInput{
					Cluster:   &n,
					NextToken: next_token,
				}
			}

			container_arns, err := awsclients.ECS.ListContainerInstances(describe_container_instances)
			if err != nil {
				log.Warning("Failed to list container instances: ", err)
				return err
			}

			for _, arn_ref := range container_arns.ContainerInstanceArns {
				if arn_ref != nil {
					arn := *arn_ref
					container_arn_set[arn] = true
				}
			}

			next_token = container_arns.NextToken
			if next_token == nil {
				break
			}
		}

		for _, container_arn := range task_mapping {
			container_arn_set[container_arn] = true
		}
		container_arn_lst := make([]*string, len(container_arn_set))
		j := 0
		for container_arn := range container_arn_set {
			n := container_arn
			container_arn_lst[j] = &n
			j++
		}

		/* now, describe container_arns */
		cursor := 0
		for {
			if cursor >= len(container_arn_lst) {
				break
			}
			cursor_end := cursor + 50
			if cursor_end > len(container_arn_lst) {
				cursor_end = len(container_arn_lst)
			}

			lst := make([]*string, cursor_end-cursor)
			for i, v := range container_arn_lst[cursor:cursor_end] {
				n := *v
				lst[i] = &n
			}
			container_input := &ecs.DescribeContainerInstancesInput{
				Cluster:            &n,
				ContainerInstances: lst,
			}
			cursor += 50
			container_descs, err := awsclients.ECS.DescribeContainerInstances(container_input)
			if err != nil {
				log.Warning("Cannot describe container instances: ", err)
				return err
			}

			for _, container_desc := range container_descs.ContainerInstances {
				/* TODO: this is quadratic. Fix it at some point */
				for task_arn, container_arn := range task_mapping {
					if container_arn == *container_desc.ContainerInstanceArn {
						task_ec2_mapping[task_arn] = *container_desc.Ec2InstanceId
						lst, ok := tasks_per_ec2instance[*container_desc.Ec2InstanceId]
						if ok {
							tasks_per_ec2instance[*container_desc.Ec2InstanceId] = append(lst, task_arn)
						} else {
							new_lst := make([]string, 1)
							new_lst[0] = task_arn
							tasks_per_ec2instance[*container_desc.Ec2InstanceId] = new_lst
						}
					}
				}
				if container_desc.Ec2InstanceId != nil {
					ec2instances_set[*container_desc.Ec2InstanceId] = arnInfo{
						ecsClusterARN:         n,
						computeEnvironmentARN: ecs_clusters[n],
					}
					/* Make sure there is an empty job listing when there are no tasks on the instance */
					_, ok := tasks_per_ec2instance[*container_desc.Ec2InstanceId]
					if !ok {
						new_lst := make([]string, 0)
						tasks_per_ec2instance[*container_desc.Ec2InstanceId] = new_lst
					}
				}
			}
		}
	}

	ec2instances_lst := make([]*string, 0)
	for ec2instance, _ := range ec2instances_set {
		n := ec2instance
		ec2instances_lst = append(ec2instances_lst, &n)
	}

	ec2instances_info := make(map[string]Ec2Info)

	cursor := 0
	for {
		cursor_end := cursor + 50
		if cursor >= len(ec2instances_lst) {
			break
		}
		if cursor_end > len(ec2instances_lst) {
			cursor_end = len(ec2instances_lst)
		}

		lst := make([]*string, cursor_end-cursor)
		for i, v := range ec2instances_lst[cursor:cursor_end] {
			n := *v
			lst[i] = &n
		}
		cursor += 50

		instances_input := &ec2.DescribeInstancesInput{
			InstanceIds: lst,
		}
		instances_descs, err := awsclients.EC2.DescribeInstances(instances_input)
		if err != nil {
			log.Warning("Cannot describe instances: ", err)
			return err
		}

		for _, reservation := range instances_descs.Reservations {
			for _, instance := range reservation.Instances {
				// What is `fromMaybe` of Go language?
				public_ip := instance.PublicIpAddress
				private_ip := instance.PrivateIpAddress
				ami := ""
				if instance.ImageId != nil {
					ami = *instance.ImageId
				}
				instance_id := ""
				if instance.InstanceId != nil {
					instance_id = *instance.InstanceId
				}
				compute_environment_arn := ""
				ecs_cluster_arn := ""
				info, ok := ec2instances_set[instance_id]
				if ok {
					compute_environment_arn = info.computeEnvironmentARN
					ecs_cluster_arn = info.ecsClusterARN
				}
				az := ""
				if instance.Placement != nil && instance.Placement.AvailabilityZone != nil {
					az = *instance.Placement.AvailabilityZone
				}
				sir := instance.SpotInstanceRequestId
				instance_type := ""
				if instance.InstanceType != nil {
					instance_type = *instance.InstanceType
				}
				launched_at := instance.LaunchTime
				ec2instances_info[*instance.InstanceId] = Ec2Info{
					PublicIP:  public_ip,
					PrivateIP: private_ip,
					AMI:       ami,
					ComputeEnvironmentARN: compute_environment_arn,
					ECSClusterARN:         ecs_cluster_arn,
					AvailabilityZone:      az,
					SpotInstanceRequestID: sir,
					InstanceType:          instance_type,
					LaunchedAt:            launched_at,
				}
			}
		}
	}

	err1 := fs.UpdateTaskArnsInstanceIDs(ec2instances_info, task_ec2_mapping)
	err2 := fs.UpdateECSInstances(ec2instances_info, tasks_per_ec2instance)

	if err1 != nil {
		return err1
	}
	return err2
}
