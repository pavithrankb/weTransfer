package storage

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

type SQS struct {
	client *sqs.Client
}

// NewSQS initializes the AWS SDK and returns an SQS helper.
func NewSQS(ctx context.Context) (*SQS, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	client := sqs.NewFromConfig(cfg)
	return &SQS{client: client}, nil
}

// CheckQueue verifies connectivity to the queue URL
func (s *SQS) CheckQueue(ctx context.Context, queueURL string) error {
	_, err := s.client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
		QueueUrl: aws.String(queueURL),
		AttributeNames: []types.QueueAttributeName{
			types.QueueAttributeNameQueueArn,
		},
	})
	return err
}

// ReceiveMessages polls SQS for messages
func (s *SQS) ReceiveMessages(ctx context.Context, queueURL string, maxMessages int32, waitTime int32) ([]types.Message, error) {
	output, err := s.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds:     waitTime,
		VisibilityTimeout:   60, // Give worker 60s to process email
	})
	if err != nil {
		return nil, err
	}
	return output.Messages, nil
}

// DeleteMessage deletes a processed message from SQS
func (s *SQS) DeleteMessage(ctx context.Context, queueURL string, receiptHandle *string) error {
	_, err := s.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(queueURL),
		ReceiptHandle: receiptHandle,
	})
	return err
}
