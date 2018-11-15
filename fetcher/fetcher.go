package fetcher

// This module is just a wrapper that can either fetch files out of S3 or
// locally.

import (
	"io/ioutil"
	"regexp"

	"github.com/AdRoll/batchiepatchie/awsclients"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3/s3manager"
)

var s3Regex = regexp.MustCompile("^s3://([^/]+)/(.+)$")

func ReadAllNoSessions(location string) ([]byte, error) {
	s3match := s3Regex.FindStringSubmatch(location)
	if s3match == nil {
		return readAllLocalFile(location)
	}

	// This function is like ReadAll but does not rely on awsclients package having been set up yet.
	ses := session.Must(session.NewSession(&aws.Config{Region: aws.String("us-east-1"), MaxRetries: aws.Int(10)}))
	region_loc, err := s3manager.GetBucketRegion(aws.BackgroundContext(), ses, s3match[1], "us-east-1")
	if err != nil {
		return nil, err
	}
	session := session.Must(session.NewSession(&aws.Config{Region: aws.String(region_loc)}))
	s3s := s3.New(session)

	result, err := s3s.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(s3match[1]),
		Key:    aws.String(s3match[2]),
	})
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()
	return ioutil.ReadAll(result.Body)
}

func ReadAll(location string) ([]byte, error) {
	s3match := s3Regex.FindStringSubmatch(location)
	if s3match == nil {
		return readAllLocalFile(location)
	}

	bucket := s3match[1]
	key := s3match[2]

	s3client, err := awsclients.GetS3ClientForBucket(bucket)
	if err != nil {
		return nil, err
	}

	result, err := s3client.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}

	defer result.Body.Close()
	return ioutil.ReadAll(result.Body)
}

func readAllLocalFile(location string) ([]byte, error) {
	return ioutil.ReadFile(location)
}
