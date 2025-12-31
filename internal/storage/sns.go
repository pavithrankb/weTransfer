package storage

import (
	"context"
	"encoding/json"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
)

type SNS struct {
	client *sns.Client
}

// NewSNS initializes the AWS SDK and returns an SNS helper.
func NewSNS(ctx context.Context) (*SNS, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}

	client := sns.NewFromConfig(cfg)
	return &SNS{client: client}, nil
}

// ShareDownloadMessage is the event published to SNS for email sharing
// TODO: Replace direct S3 URLs with application-level download links
type ShareDownloadMessage struct {
	EventType   string   `json:"event_type"`
	TransferID  string   `json:"transfer_id"`
	Emails      []string `json:"emails"`
	DownloadURL string   `json:"download_url"`
	ExpiresAt   string   `json:"expires_at"`
	Filename    string   `json:"filename"`
	FileSize    int64    `json:"file_size"`
}

// PublishShareDownload publishes a share-download event to SNS
func (s *SNS) PublishShareDownload(ctx context.Context, topicARN string, msg ShareDownloadMessage) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	_, err = s.client.Publish(ctx, &sns.PublishInput{
		TopicArn: aws.String(topicARN),
		Message:  aws.String(string(payload)),
		Subject:  aws.String("File ready for download"),
	})
	return err
}
