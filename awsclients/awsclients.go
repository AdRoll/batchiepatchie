package awsclients

// This module just consolidates all Client objects in one place so we don't
// hammer metadata services or anything.

import (
	"sync"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/batch"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/aws/aws-sdk-go/service/ecs"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
)

var Session *session.Session
var s3B map[string]*s3.S3
var s3R map[string]*s3.S3
var Batch *batch.Batch
var ECS *ecs.ECS
var EC2 *ec2.EC2
var CloudWatchLogs *cloudwatchlogs.CloudWatchLogs
var S3General *s3.S3

var s3Lock = &sync.Mutex{}

func GetS3ClientForBucket(bucket string) (*s3.S3, error) {
	s3Lock.Lock()

	region, ok := s3B[bucket]
	if !ok {
		// Unlock the mutex for the duration of getting bucket location.
		s3Lock.Unlock()
		region_loc, err := s3manager.GetBucketRegion(aws.BackgroundContext(), Session, bucket, "us-east-1")
		if err != nil {
			return nil, err
		}
		s3Lock.Lock()

		region_svc, ok := s3R[region_loc]
		if !ok {
			s3Lock.Unlock()
			session := session.Must(
				session.NewSession(&aws.Config{Region: aws.String(region_loc)}))
			region_svc_loc := s3.New(session)
			s3Lock.Lock()
			s3R[region_loc] = region_svc_loc
			region_svc = region_svc_loc
		}
		s3B[bucket] = region_svc
		region = region_svc
	}

	s3Lock.Unlock()
	return region, nil
}

func OpenSessions(region string) error {
	conf := &aws.Config{
		Region:     aws.String(region),
		MaxRetries: aws.Int(10),
	}
	Session = session.Must(session.NewSession(conf))
	Batch = batch.New(Session)
	S3General = s3.New(Session)
	ECS = ecs.New(Session)
	EC2 = ec2.New(Session)
	s3B = make(map[string]*s3.S3)
	s3R = make(map[string]*s3.S3)
	CloudWatchLogs = cloudwatchlogs.New(Session)

	return nil
}
