# WeTransfer — File Sharing Platform

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/PostgreSQL_RDS-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/AWS-S3%20%7C%20CloudFront%20%7C%20ELB%20%7C%20SNS%20%7C%20SQS%20%7C%20Lambda%20%7C%20SES-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS">
</p>

<p align="center">
  <strong>A production-ready file transfer service inspired by WeTransfer</strong><br>
  <em>Secure uploads • Presigned URLs • Event-driven notifications • Zero-proxy architecture</em>
</p>

---

## 🎬 Demo

<p align="center">
  <a href="https://youtu.be/SZsibG8U2jA">
    <img src="https://img.shields.io/badge/▶_Watch_Demo-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch Demo on YouTube">
  </a>
</p>

<p align="center">
  👆 <strong><a href="https://youtu.be/SZsibG8U2jA">Click here to watch the demo</a></strong> 👆<br>
  <em>See the platform in action — file uploads, downloads, and email sharing</em>
</p>

---

## 💡 Why This Exists

Ever wondered how services like **WeTransfer** handle millions of file transfers without their servers exploding? The secret is **they don't touch your files** — and neither does this project.

This is a **full-stack demonstration** of a modern, cloud-native file sharing platform built with:

| What | Why |
|------|-----|
| 🎛️ **Backend as Control Plane** | Orchestrates transfers and manages lifecycle — without ever proxying file bytes |
| ⚡ **Direct S3 Transfers** | Clients upload/download directly to/from AWS S3 using secure presigned URLs |
| 🔄 **Transfer Lifecycle Management** | Expiry, download limits, and status transitions are managed server-side |
| 📧 **Event-Driven Notifications** | SNS → SQS → Lambda → SES pipeline for async email delivery |
| 🌍 **Global Edge Delivery** | CloudFront CDN ensures fast downloads worldwide |
| ⚖️ **High Availability** | Elastic Load Balancer distributes traffic across EC2 instances |

> **TL;DR**: Your backend stays lean, your transfers stay fast, and your architecture stays scalable.

---

## System Architecture

This section provides a visual overview of the file transfer architecture, including both **Download** and **Upload** flows.

### Download Flow Architecture

![Download Flow Architecture](download.design.drawio.svg)

#### Download Flow Steps

| Step | Title | Description |
|------|-------|-------------|
| 1 | **Client Request via Load Balancer** | User clicks download. The request goes through AWS Elastic Load Balancer which distributes traffic to healthy EC2 instances. |
| 2 | **EC2 Backend Processes Request** | Go backend on EC2 receives the request, verifies transfer status, and generates a presigned download URL from AWS S3. |
| 3 | **Metadata Query to RDS** | Backend queries AWS RDS PostgreSQL for file metadata and updates download count for analytics. |
| 4 | **Publish Notification to SNS** | Backend publishes a download event to AWS SNS topic for asynchronous notification processing. |
| 5a | **SNS Fans Out to SQS** | SNS receives the download event and fans out the message to the SQS queue for asynchronous processing. |
| 5b | **Presigned URL Returned to Client** | Meanwhile, the presigned download URL is returned to the client for direct file access. |
| 6 | **SQS Triggers Lambda** | AWS Lambda is triggered by the SQS message to process the download notification event. |
| 7 | **Lambda Invokes SES** | Lambda processes the event and invokes AWS SES (Simple Email Service) to send the notification. |
| 8 | **SES Sends Email with Download Link** | AWS SES delivers the email notification with the download link to the recipient. |
| 9 | **Download via CloudFront CDN** | Client downloads the file directly from S3 via AWS CloudFront CDN, providing low-latency access with edge caching for faster downloads globally. |

#### Download Flow Key Benefits

- 🌐 Elastic Load Balancer for high availability
- 🚀 CloudFront CDN for low-latency global edge caching
- 💾 Direct S3 download bypasses server
- 🔗 Event-driven architecture with SNS & SQS
- ⚡ Serverless notifications with Lambda
- 📧 Email notifications with download link via AWS SES
- 📊 Download analytics in PostgreSQL RDS

---

### Upload Flow Architecture

![Upload Flow Architecture](upload.design.drawio.svg)

#### Upload Flow Steps

| Step | Title | Description |
|------|-------|-------------|
| 1 | **Request Upload URL** | User selects a file and the React frontend sends a request to the Go backend (AWS EC2) to generate a presigned upload URL. |
| 2 | **Backend Contacts AWS S3** | Go backend communicates with AWS S3 to create a presigned URL valid for 5 minutes. This URL grants temporary, secure upload access. |
| 3 | **Store Metadata in PostgreSQL** | Transfer metadata (filename, size, expiry, etc.) is stored in PostgreSQL RDS for tracking and management. |
| 4 | **URL Returned to Client** | The presigned URL is returned to the frontend client, ready for direct upload. |
| 5/6 | **Client Uploads Directly to S3** | The client automatically uploads the file directly to AWS S3 using the presigned URL via HTTPS. Backend is completely bypassed for the file transfer. |

#### Upload Flow Key Benefits

- ⏱️ Upload URLs expire in 5 minutes
- 💾 Direct S3 upload bypasses server
- 🖥️ Frontend & Backend on AWS EC2
- 🗄️ Metadata stored in PostgreSQL RDS
- 🌐 Secure HTTPS transfer via AWS
- ✅ Scalable cloud architecture

---

## Prerequisites

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `S3_BUCKET` | AWS S3 bucket name for file storage | ✅ Yes |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) | ✅ Yes |

### Optional Environment Variables (Email Sharing)

| Variable | Description | Required |
|----------|-------------|----------|
| `SNS_TOPIC_ARN` | AWS SNS topic ARN for email notifications | For email sharing |
| `SQS_QUEUE_URL` | AWS SQS queue URL for email worker | For email sharing |
| `SES_FROM_EMAIL` | Verified SES sender email address | For email sharing |

### AWS Credentials

AWS credentials must be available at runtime via one of:
- Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- AWS profile (`~/.aws/credentials`)
- EC2 / IAM instance role

---

## Run (Development)

Build and run:

```bash
go build -o app ./cmd/api && ./app --logToTerminal --debugMode
```

Or run directly:

```bash
go run ./cmd/api --logToTerminal --debugMode
```

---

## Logging

- Logs are written to `app.log`
- Use `--logToTerminal` to also print logs to stdout

---

## Transfer Lifecycle

```
INIT → READY → EXPIRED → DELETED
```

- **INIT**
  - Transfer created
  - Awaiting upload
- **READY**
  - Client marked the transfer complete
  - Server set `status = READY`
  - File is downloadable
- **EXPIRED**
  - `expires_at` has passed
  - All operations fail with **410 Gone**
  - Can be revived to READY by updating `expires_at`
- **DELETED**
  - Transfer explicitly deleted or cleaned up
  - S3 object removed

## Cleanup & Expiry

- **Lazy Expiry**: Transfers are checked for expiry during access (get/list/action). If expired, status is updated to `EXPIRED` (410 Gone).
- **Enforcement**: Actions on expired transfers are blocked.
- **Cleanup Job**: A background job runs every hour to physically delete S3 objects for `EXPIRED` transfers and mark them as `DELETED`.

---

## Concurrency Safety

- The `complete` operation uses an **atomic conditional UPDATE**
- The update only succeeds when `status = 'INIT'`
- Concurrent callers receive **409 Conflict** if the state was already modified

This prevents race conditions from retries or duplicate requests.

---

## API Endpoints

### GET `/health`

Health check endpoint.

**Response — 200 OK**
```json
{ "status": "OK" }
```

---

### POST `/transfers`

Create a transfer record.

**Request JSON**
```json
{ 
  "expires_at": "2026-02-01T10:00:00Z",
  "max_downloads": 3  // Optional, default: 1
}
```

**Behavior**
- Validates `expires_at` is in the future
- Validates `max_downloads` >= 1
- Creates a transfer with a generated UUID
- Sets `status = "INIT"`

**Response — 201 Created**
```json
{ "id": "<uuid>", "status": "INIT" }
```

### GET `/transfers`

List transfers with filtering, sorting, and pagination.

**Query Parameters**
| Parameter | Description | Default |
|-----------|-------------|---------|
| `status` | Filter by status (INIT, READY, EXPIRED, DELETED) | All |
| `limit` | Items per page (1-100) | 50 |
| `offset` | Pagination offset | 0 |
| `sort_by` | Sort field: `created_at`, `expires_at`, `max_downloads`, `file_size` | `created_at` |
| `order` | Sort order: `ASC` or `DESC` | `DESC` |

**Response — 200 OK**
```json
{
  "items": [...],
  "limit": 50,
  "offset": 0,
  "total_count": 125
}
```

### GET `/transfers/{id}`

Get transfer details.

**Response — 200 OK**
```json
{
  "id": "<uuid>",
  "status": "READY",
  "expires_at": "2026-02-01T10:00:00Z",
  "created_at": "2026-01-01T10:00:00Z",
  "download_count": 0,
  "max_downloads": 3,
  "filename": "video.mp4",
  "file_type": "video/mp4",
  "file_size": 10485760,
  "uploaded_at": "2026-01-01T10:05:00Z"
}
```

### PATCH `/transfers/{id}`

Update a transfer.

**Request JSON (Partial)**
```json
{
  "expires_at": "2026-03-01T00:00:00Z",
  "max_downloads": 5
}
```

**Rules**
- Allowed for **READY** and **EXPIRED** transfers.
- **Revival**: Updating `expires_at` on an **EXPIRED** transfer sets it to **READY**.
- **Status Update**: Status can be manually updated to `"EXPIRED"`.
- Forbidden for **INIT** or **DELETED**.

### DELETE `/transfers/{id}`

Delete a transfer.

**Behavior**
- Deletes S3 object (best effort)
- Performs a **Hard Delete** from the database (`DELETE FROM transfers`)
- Returns `204 No Content`

### DELETE `/trigger-delete`

Manually trigger the background cleanup job.

**Response — 200 OK**
```json
{ "message": "cleanup triggered" }
```

---

### POST `/transfers/{id}/upload-url`

Generate a presigned S3 **PUT** URL.

**Request JSON**
```json
{ "filename": "video.mp4", "content_type": "video/mp4" }
```

**Behavior**
1. Validate `filename` (no `/`, `..`, not empty)
2. Fetch transfer from DB; require:
   - transfer exists
   - `status == "INIT"`
   - not expired
3. Build object key:  
   `uploads/<transfer_id>/<filename>`
4. Generate a presigned PUT URL (5-minute expiry) constrained to:
   - bucket
   - object key
   - content type
5. Persist `object_key` in the `transfers` row

**Response — 200 OK**
```json
{
  "upload_url": "<presigned PUT url>",
  "object_key": "uploads/<transfer_id>/video.mp4"
}
```

---

### POST `/transfers/{id}/complete`

Mark the transfer as ready for download.

**Request**
- Empty body

**Behavior**
1. Extract `id` from URL
2. Fetch transfer; require:
   - transfer exists
   - `status == "INIT"`
   - not expired
   - `object_key` is set (upload URL was requested)
3. Validate upload by calling S3 HeadObject to get file metadata
4. Atomically update `status → READY` and store file metadata
5. Return error if concurrent modification prevents the update (409 Conflict)

**Response — 200 OK**
```json
{
  "id": "<transfer_id>",
  "status": "READY",
  "filename": "video.mp4",
  "file_type": "video/mp4",
  "file_size": 10485760
}
```

---

### GET `/transfers/{id}/download-url`

Generate a presigned S3 **GET** URL.

**Query Parameters**
| Parameter | Description | Default |
|-----------|-------------|---------|
| `expiry_minutes` | URL expiry time in minutes (1-10080, max 1 week) | 5 |

**Behavior**
1. Fetch transfer; require:
   - transfer exists
   - `status == "READY"`
   - not expired
   - `object_key` present
   - `download_count < max_downloads`
2. Generate a presigned GET URL (default 5-minute expiry, configurable)
3. Atomically increment `download_count`

**Response — 200 OK**
```json
{ "download_url": "<presigned GET url>" }
```

**Error Responses**
- `404 Not Found` — Transfer not found
- `400 Bad Request` — Transfer not ready or object not available
- `410 Gone` — Transfer expired or download limit reached

---

### POST `/transfers/{id}/share-download`

Share the download link via email. Publishes an event to SNS for async email delivery.

**Request JSON**
```json
{
  "emails": ["recipient1@example.com", "recipient2@example.com"]
}
```

**Behavior**
1. Validate emails (at least one required, basic format validation)
2. Fetch transfer; require:
   - transfer exists
   - `status == "READY"`
   - not expired
   - `object_key` present
3. Generate a presigned GET URL (1-hour expiry)
4. Publish `TRANSFER_SHARED` event to SNS (async)
5. Return immediately with accepted status

**Response — 202 Accepted**
```json
{ "status": "accepted" }
```

**Error Responses**
- `503 Service Unavailable` — Email sharing not configured (SNS_TOPIC_ARN not set)
- `404 Not Found` — Transfer not found
- `400 Bad Request` — Invalid emails, transfer not ready, or object not available
- `410 Gone` — Transfer expired

---

## Recommended Client Flow

### 1. Create a transfer

```bash
curl -X POST http://localhost:8080/transfers \
  -H 'Content-Type: application/json' \
  -d '{"expires_at":"2026-02-01T10:00:00Z", "max_downloads": 5}'
```

Response contains `id`.

---

### 2. Request upload URL

```bash
curl -X POST http://localhost:8080/transfers/<id>/upload-url \
  -H 'Content-Type: application/json' \
  -d '{"filename":"video.mp4","content_type":"video/mp4"}'
```

---

### 3. Upload file directly to S3

> **Important:** `Content-Type` must match the value used when generating the upload URL.

```bash
curl -X PUT "<upload_url>" \
  -H "Content-Type: video/mp4" \
  --upload-file ./video.mp4
```

---

### 4. Mark transfer complete

```bash
curl -X POST http://localhost:8080/transfers/<id>/complete
```

---

### 5. Request download URL (after READY)

```bash
curl -X GET http://localhost:8080/transfers/<id>/download-url
```

---

## Notes

- The server does **not** proxy file bytes
- Uploads and downloads go directly to S3 using presigned URLs
- `S3_BUCKET` must be set in the runtime environment
- The `transfers` table must contain:

```sql
id UUID PRIMARY KEY
expires_at TIMESTAMPTZ NOT NULL
status TEXT NOT NULL DEFAULT 'INIT'
object_key TEXT
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
max_downloads INT NOT NULL DEFAULT 1
download_count INT NOT NULL DEFAULT 0
filename TEXT
file_type TEXT
file_size BIGINT
uploaded_at TIMESTAMPTZ
```

---

## Email Notification Flow

When a user shares a download link via the `/transfers/{id}/share-download` endpoint:

1. **Backend publishes to SNS** — A `TRANSFER_SHARED` event is published to the configured SNS topic
2. **SNS fans out to SQS** — The message is delivered to an SQS queue
3. **Lambda processes the message** — A Lambda function polls SQS and processes the event
4. **SES sends emails** — Lambda invokes SES to send download link emails to recipients

### SNS Message Format

```json
{
  "event_type": "TRANSFER_SHARED",
  "transfer_id": "<uuid>",
  "emails": ["recipient@example.com"],
  "download_url": "<presigned URL>",
  "expires_at": "2026-01-01T11:00:00Z",
  "filename": "video.mp4",
  "file_size": 10485760
}
```
