package jobs

import (
	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
)

func GetComputeEnvironments(parentSpan opentracing.Span) ([]ComputeEnvironment, error) {
	span := opentracing.StartSpan("GetComputeEnvironments", opentracing.ChildOf(parentSpan.Context()))
	defer span.Finish()

	var nextToken *string
	var hundred int64

	compute_environments := make([]*batch.ComputeEnvironmentDetail, 0)

	for {
		hundred = 100
		out, err := awsclients.Batch.DescribeComputeEnvironments(&batch.DescribeComputeEnvironmentsInput{
			MaxResults: &hundred,
			NextToken:  nextToken,
		})
		if err != nil {
			log.Warning("Failed to fetch compute environments: ", err)
			return nil, err
		}
		nextToken = out.NextToken

		for _, detail := range out.ComputeEnvironments {
			compute_environments = append(compute_environments, detail)
		}

		if nextToken == nil {
			break
		}
	}

	/* Transform into our internal format, which is a bit nicer */
	ce_lst := make([]ComputeEnvironment, 0)
	for _, ce_aws := range compute_environments {
		if ce_aws.ComputeEnvironmentName != nil &&
			ce_aws.ComputeResources != nil &&
			ce_aws.ServiceRole != nil &&
			ce_aws.State != nil &&
			ce_aws.ComputeResources.MaxvCpus != nil &&
			ce_aws.ComputeResources.MinvCpus != nil &&
			ce_aws.ComputeResources.DesiredvCpus != nil {
			ce := ComputeEnvironment{
				Name:        *ce_aws.ComputeEnvironmentName,
				WantedvCpus: *ce_aws.ComputeResources.DesiredvCpus,
				MinvCpus:    *ce_aws.ComputeResources.MinvCpus,
				MaxvCpus:    *ce_aws.ComputeResources.MaxvCpus,
				State:       *ce_aws.State,
				ServiceRole: *ce_aws.ServiceRole}
			ce_lst = append(ce_lst, ce)
		}
	}

	return ce_lst, nil
}

func MonitorComputeEnvironments(fs Storer, queues []string) {
	span := opentracing.StartSpan("MonitorComputeEnvironments")
	defer span.Finish()

	if len(queues) == 0 {
		return
	}

	compute_environments, err := GetComputeEnvironments(span)
	if err != nil {
		return
	}

	fs.UpdateComputeEnvironmentsLog(compute_environments)
}
