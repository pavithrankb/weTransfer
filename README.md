# We Transfer

A backend service that enables secure, scalable file transfers using **Go**, **PostgreSQL**, and **AWS S3 presigned URLs**.  
The backend manages transfer lifecycle and permissions, while file bytes are uploaded and downloaded directly from S3.

---

## Why This Exists

This project demonstrates a WeTransfer-style backend architecture where:

- The backend acts as a **control plane**
- File uploads/downloads happen directly between client and S3
- Transfer lifecycle and permissions are enforced server-side
- The backend never proxies file bytes

---

## System Architecture

This section provides a visual overview of the file transfer architecture, including both **Upload** and **Download** flows.

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
- � CloudFront CDN for low-latency global edge caching
- �💾 Direct S3 download bypasses server
- 🔗 Event-driven architecture with SNS & SQS
- ⚡ Serverless notifications with Lambda
- 📧 Email notifications with download link via AWS SES
- 📊 Download analytics in PostgreSQL RDS

---

## Prerequisites

- `DATABASE_URL` environment variable pointing to PostgreSQL
- `S3_BUCKET` environment variable for the S3 bucket
- AWS credentials/config available at runtime:
  - Environment variables
  - AWS profile
  - EC2 / IAM role

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

List transfers with filtering and pagination.

**Query Parameters**
- `status`: (Optional) Filter by status (INIT, READY, EXPIRED, DELETED)
- `limit`: (Optional) Items per page (default 50, max 100)
- `offset`: (Optional) Pagination offset (default 0)

**Response — 200 OK**
```json
{
  "items": [...],
  "limit": 50,
  "offset": 0
}
```

### GET `/transfers/{id}`

Get transfer details.

**Response — 200 OK**
```json
{
  "id": "<uuid>",
  "status": "READY",
  "expires_at": "...",
  "download_count": 0,
  "max_downloads": 3,
  ...
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
3. Atomically update `status → READY`
4. Return error if concurrent modification prevents the update

**Response — 200 OK**
```json
{ "id": "<transfer_id>", "status": "READY" }
```

---

### GET `/transfers/{id}/download-url`

Generate a presigned S3 **GET** URL.

**Request**
- No body

**Behavior**
1. Fetch transfer; require:
   - transfer exists
   - `status == "READY"`
   - not expired
   - `object_key` present
   - `download_count < max_downloads`
2. Generate a presigned GET URL (5-minute expiry)
3. Atomically increment `download_count`

**Response — 200 OK**
```json
{ "download_url": "<presigned GET url>" }
```

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
expires_at TIMESTAMPTZ
status TEXT
object_key TEXT
created_at TIMESTAMPTZ
max_downloads INT DEFAULT 1
download_count INT DEFAULT 0
```
