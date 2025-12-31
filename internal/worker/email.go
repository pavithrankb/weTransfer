package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/pavithrankb/weTransfer/internal/storage"
)

// SNSEnvelope represents the standard wrapper that SNS wraps messages in when delivering to SQS
type SNSEnvelope struct {
	Type      string `json:"Type"`
	MessageId string `json:"MessageId"`
	Message   string `json:"Message"` // This is the escaped JSON string of our actual payload
}

// StartEmailWorker starts the email worker process.
// It is designed to run in a goroutine and blocking forever (or until context cancel if we improved it, but for now loop forever).
func StartEmailWorker(ctx context.Context, logger *log.Logger) {
	// 1. Load Environment Variables
	queueURL := os.Getenv("SQS_QUEUE_URL")
	fromEmail := os.Getenv("SES_FROM_EMAIL")
	region := os.Getenv("AWS_REGION")

	if queueURL == "" || fromEmail == "" || region == "" {
		// Log as warning and return, so we don't crash the main server but also don't run the worker
		logger.Println("Email worker: Missing required environment variables (SQS_QUEUE_URL, SES_FROM_EMAIL, AWS_REGION). Worker disabled.")
		return
	}

	// Use a separate context for the long-running worker to avoid timeout from initialization context
	workerCtx := context.Background()

	// 2. Initialize AWS Clients
	sqsClient, err := storage.NewSQS(workerCtx)
	if err != nil {
		logger.Printf("Email worker: Failed to initialize SQS: %v. Worker disabled.", err)
		return
	}

	sesClient, err := storage.NewSES(workerCtx)
	if err != nil {
		logger.Printf("Email worker: Failed to initialize SES: %v. Worker disabled.", err)
		return
	}

	// Verify Queue Access
	if err := sqsClient.CheckQueue(workerCtx, queueURL); err != nil {
		logger.Printf("Email worker: Failed to access SQS queue: %v. Worker disabled.", err)
		return
	}

	logger.Printf("Email worker started. Polling queue: %s", queueURL)

	// 3. Polling Loop
	for {
		messages, err := sqsClient.ReceiveMessages(workerCtx, queueURL, 10, 20) // max 10 msgs, wait 20s (long polling)
		if err != nil {
			logger.Printf("Email worker: Error receiving messages: %v", err)
			time.Sleep(5 * time.Second) // Backoff on error
			continue
		}

		if len(messages) == 0 {
			// No messages, loop again (long polling already waited)
			continue
		}

		logger.Printf("Email worker: Received %d messages", len(messages))

		// 4. Process Messages
		for _, msg := range messages {
			processMessage(workerCtx, sqsClient, sesClient, queueURL, msg.Body, msg.ReceiptHandle, fromEmail, logger)
		}
	}
}

func processMessage(ctx context.Context, sqsClient *storage.SQS, sesClient *storage.SES, queueURL string, body *string, receiptHandle *string, fromEmail string, logger *log.Logger) {
	if body == nil {
		return
	}

	// Parse SNS Envelope
	var envelope SNSEnvelope
	if err := json.Unmarshal([]byte(*body), &envelope); err != nil {
		logger.Printf("Error parsing SNS envelope: %v. Body: %s", err, *body)
		// If we can't parse it, it might be a raw message or malformed.
		return
	}

	// Parse Logic Event from envelope.Message
	var event storage.ShareDownloadMessage
	if err := json.Unmarshal([]byte(envelope.Message), &event); err != nil {
		logger.Printf("Error parsing event payload: %v. Message: %s", err, envelope.Message)
		// We delete malformed application messages so they don't block
		_ = sqsClient.DeleteMessage(ctx, queueURL, receiptHandle)
		return
	}

	// Only process recognized events
	if event.EventType != "TRANSFER_SHARED" {
		logger.Printf("Skipping unknown event type: %s", event.EventType)
		_ = sqsClient.DeleteMessage(ctx, queueURL, receiptHandle)
		return
	}

	logger.Printf("Processing TRANSFER_SHARED event for transfer %s. Recipients: %d", event.TransferID, len(event.Emails))

	// Send Emails
	emailSubject := "File ready for download"
	emailBody := fmt.Sprintf(`A file has been shared with you.

File: %s
Size: %d bytes

Download link:
%s

Note: This link will expire at %s.
`, event.Filename, event.FileSize, event.DownloadURL, event.ExpiresAt)

	successCount := 0
	for _, recipient := range event.Emails {
		err := sesClient.SendEmail(ctx, fromEmail, recipient, emailSubject, emailBody)
		if err != nil {
			logger.Printf("Failed to send email to %s: %v", recipient, err)
		} else {
			logger.Printf("Email sent to %s", recipient)
			successCount++
		}
	}

	// Delete message if at least one email was sent or if list was empty (prevent infinite loop)
	if successCount > 0 || len(event.Emails) == 0 {
		if err := sqsClient.DeleteMessage(ctx, queueURL, receiptHandle); err != nil {
			logger.Printf("Failed to delete message: %v", err)
		} else {
			logger.Printf("Message processed and deleted.")
		}
	} else {
		logger.Printf("Failed to send any emails. Message left in queue for retry.")
	}
}
