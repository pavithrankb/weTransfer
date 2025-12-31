package storage

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3 struct {
	client  *s3.Client
	presign *s3.PresignClient
}

// NewS3 initializes the AWS SDK and returns an S3 helper.
func NewS3(ctx context.Context) (*S3, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg)
	presigner := s3.NewPresignClient(client)

	return &S3{client: client, presign: presigner}, nil
}

// PresignPutURL returns a presigned PUT URL for the given bucket/key and content type.
func (s *S3) PresignPutURL(ctx context.Context, bucket, key, contentType string, expires time.Duration) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	resp, err := s.presign.PresignPutObject(ctx, input, s3.WithPresignExpires(expires))
	if err != nil {
		return "", err
	}

	return resp.URL, nil
}

// PresignGetURL returns a presigned GET URL for the given bucket/key.
func (s *S3) PresignGetURL(ctx context.Context, bucket, key string, expires time.Duration) (string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}

	resp, err := s.presign.PresignGetObject(ctx, input, s3.WithPresignExpires(expires))
	if err != nil {
		return "", err
	}

	return resp.URL, nil
}

// DeleteObject deletes an object from S3.
func (s *S3) DeleteObject(ctx context.Context, bucket, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	return err
}

// HeadObject retrieves metadata for an object from S3.
// Returns size (ContentLength) and contentType (ContentType).
func (s *S3) HeadObject(ctx context.Context, bucket, key string) (int64, string, error) {
	output, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return 0, "", err
	}

	size := int64(0)
	if output.ContentLength != nil {
		size = *output.ContentLength
	}

	contentType := ""
	if output.ContentType != nil {
		contentType = *output.ContentType
	}

	return size, contentType, nil
}
