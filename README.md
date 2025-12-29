# SwiftDrop

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
INIT → READY → EXPIRED
```

- **INIT**
  - Transfer created
  - Awaiting upload
- **READY**
  - Client marked the transfer complete
  - Server set `status = READY`
- **EXPIRED**
  - `expires_at` has passed
  - All operations fail with **410 Gone**

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
{ "expires_at": "2026-02-01T10:00:00Z" }
```

**Behavior**
- Validates `expires_at` is in the future
- Creates a transfer with a generated UUID
- Sets `status = "INIT"`

**Response — 201 Created**
```json
{ "id": "<uuid>", "status": "INIT" }
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
2. Generate a presigned GET URL (5-minute expiry)

**Response — 200 OK**
```json
{ "download_url": "<presigned GET url>" }
```

---

## Recommended Client Flow

### 1. Create a transfer

```bash
curl -X POST http://localhost:8080/transfers   -H 'Content-Type: application/json'   -d '{"expires_at":"2026-02-01T10:00:00Z"}'
```

Response contains `id`.

---

### 2. Request upload URL

```bash
curl -X POST http://localhost:8080/transfers/<id>/upload-url   -H 'Content-Type: application/json'   -d '{"filename":"video.mp4","content_type":"video/mp4"}'
```

---

### 3. Upload file directly to S3

> **Important:** `Content-Type` must match the value used when generating the upload URL.

```bash
curl -X PUT "<upload_url>"   -H "Content-Type: video/mp4"   --upload-file ./video.mp4
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
```
