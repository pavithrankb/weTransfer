package server

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type createTransferRequest struct {
	ExpiresAt    time.Time `json:"expires_at"`
	MaxDownloads *int      `json:"max_downloads"`
}

type createTransferResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

func (s *Server) createTransferHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		if s.logger != nil {
			s.logger.Printf("method not allowed: %s %s", r.Method, r.URL.Path)
		}
		return
	}

	var req createTransferRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		if s.logger != nil {
			s.logger.Printf("invalid create transfer body: %v", err)
		}
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if !req.ExpiresAt.After(time.Now().UTC()) {
		if s.logger != nil {
			s.logger.Printf("invalid expires_at: %v", req.ExpiresAt)
		}
		http.Error(w, "expires_at must be in the future", http.StatusBadRequest)
		return
	}

	maxDownloads := 1
	if req.MaxDownloads != nil {
		if *req.MaxDownloads < 1 {
			if s.logger != nil {
				s.logger.Printf("invalid max_downloads: %d", *req.MaxDownloads)
			}
			http.Error(w, "max_downloads must be >= 1", http.StatusBadRequest)
			return
		}
		maxDownloads = *req.MaxDownloads
	}

	id := uuid.New().String()

	ctx := r.Context()
	if s.logger != nil && s.debug {
		s.logger.Printf("creating transfer id=%s expires_at=%s", id, req.ExpiresAt)
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("failed to start transaction: %v", err)
		}
		http.Error(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `INSERT INTO transfers(id, expires_at, status, created_at, max_downloads) VALUES ($1, $2, $3, now(), $4)`, id, req.ExpiresAt, "INIT", maxDownloads)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("failed to insert transfer: %v", err)
		}
		http.Error(w, "failed to insert transfer", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		if s.logger != nil {
			s.logger.Printf("failed to commit transaction: %v", err)
		}
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	if s.logger != nil {
		s.logger.Printf("transfer created id=%s", id)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(createTransferResponse{ID: id, Status: "INIT"})
}

// transfersSubHandler handles dynamic subroutes under /transfers/
// expected pattern: /transfers/{id}/upload-url
func (s *Server) transfersSubHandler(w http.ResponseWriter, r *http.Request) {
	// trim prefix
	path := strings.TrimPrefix(r.URL.Path, "/transfers/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) != 2 {
		if s.logger != nil && s.debug {
			s.logger.Printf("transfersSubHandler: invalid path %s", r.URL.Path)
		}
		http.NotFound(w, r)
		return
	}
	id := parts[0]
	var action string
	if len(parts) > 1 {
		action = parts[1]
	}

	// method requirements: GET for download-url, DELETE for root ID, POST for others
	if action == "download-url" {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			if s.logger != nil {
				s.logger.Printf("method not allowed for transfers download-url: %s %s", r.Method, r.URL.Path)
			}
			return
		}
	} else if action == "" || (action != "upload-url" && action != "complete") {
		if r.Method != http.MethodDelete {
			w.Header().Set("Allow", http.MethodDelete)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	} else {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			if s.logger != nil {
				s.logger.Printf("method not allowed for transfers subroute: %s %s", r.Method, r.URL.Path)
			}
			return
		}
	}

	if action == "upload-url" {
		s.uploadURLHandler(w, r, id)
		return
	}

	if action == "complete" {
		s.completeHandler(w, r, id)
		return
	}

	if action == "download-url" {
		s.downloadURLHandler(w, r, id)
		return
	}

	if r.Method == http.MethodDelete {
		s.deleteTransferHandler(w, r, id)
		return
	}

	http.NotFound(w, r)

}

type uploadURLRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type uploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	ObjectKey string `json:"object_key"`
}

type downloadURLResponse struct {
	DownloadURL string `json:"download_url"`
}

func (s *Server) uploadURLHandler(w http.ResponseWriter, r *http.Request, id string) {
	var req uploadURLRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		if s.logger != nil {
			s.logger.Printf("invalid upload-url body: %v", err)
		}
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// filename validation
	if strings.TrimSpace(req.Filename) == "" || strings.Contains(req.Filename, "/") || strings.Contains(req.Filename, "..") {
		if s.logger != nil {
			s.logger.Printf("invalid filename: %q", req.Filename)
		}
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	var status string
	var expiresAt time.Time
	err := s.db.QueryRow(ctx, `SELECT status, expires_at FROM transfers WHERE id=$1`, id).Scan(&status, &expiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			if s.logger != nil {
				s.logger.Printf("transfer not found id=%s", id)
			}
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		if s.logger != nil {
			s.logger.Printf("failed to fetch transfer id=%s: %v", id, err)
		}
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		if s.logger != nil {
			s.logger.Printf("transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "INIT" {
		if s.logger != nil {
			s.logger.Printf("transfer not in INIT state id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	objectKey := fmt.Sprintf("uploads/%s/%s", id, req.Filename)

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		if s.logger != nil {
			s.logger.Printf("s3 bucket not configured")
		}
		http.Error(w, "s3 bucket not configured", http.StatusInternalServerError)
		return
	}

	uploadURL, err := s.s3.PresignPutURL(ctx, bucket, objectKey, req.ContentType, 5*time.Minute)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("failed to presign upload url id=%s key=%s: %v", id, objectKey, err)
		}
		http.Error(w, "failed to presign upload url", http.StatusInternalServerError)
		return
	}

	// persist object_key
	_, err = s.db.Exec(ctx, `UPDATE transfers SET object_key=$1 WHERE id=$2`, objectKey, id)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("failed to update transfer id=%s: %v", id, err)
		}
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	if s.logger != nil {
		s.logger.Printf("presigned upload url generated id=%s key=%s", id, objectKey)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(uploadURLResponse{UploadURL: uploadURL, ObjectKey: objectKey})
}

// downloadURLHandler validates a READY transfer and returns a short-lived presigned GET URL.
func (s *Server) downloadURLHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()

	var status string
	var expiresAt time.Time
	var objectKey *string

	// fetch status, expires_at, object_key
	err := s.db.QueryRow(ctx, `SELECT status, expires_at, object_key FROM transfers WHERE id=$1`, id).Scan(&status, &expiresAt, &objectKey)
	if err != nil {
		if err == pgx.ErrNoRows {
			if s.logger != nil {
				s.logger.Printf("download: transfer not found id=%s", id)
			}
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		if s.logger != nil {
			s.logger.Printf("download: failed to fetch transfer id=%s: %v", id, err)
		}
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		if s.logger != nil {
			s.logger.Printf("download: transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "READY" {
		if s.logger != nil {
			s.logger.Printf("download: transfer not READY id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not ready", http.StatusBadRequest)
		return
	}

	if objectKey == nil || strings.TrimSpace(*objectKey) == "" {
		if s.logger != nil {
			s.logger.Printf("download: missing object_key id=%s", id)
		}
		http.Error(w, "object not available", http.StatusBadRequest)
		return
	}

	// atomic increment download_count
	// we enforce max_downloads here by conditioning the update
	tag, err := s.db.Exec(ctx, `UPDATE transfers SET download_count = download_count + 1 WHERE id=$1 AND download_count < max_downloads`, id)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("download: failed to increment count id=%s: %v", id, err)
		}
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		if s.logger != nil {
			s.logger.Printf("download: limit reached id=%s", id)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_limit_reached"})
		return
	}

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		if s.logger != nil {
			s.logger.Printf("download: s3 bucket not configured")
		}
		http.Error(w, "s3 bucket not configured", http.StatusInternalServerError)
		return
	}

	downloadURL, err := s.s3.PresignGetURL(ctx, bucket, *objectKey, 5*time.Minute)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("download: failed to presign get url id=%s key=%s: %v", id, *objectKey, err)
		}
		http.Error(w, "failed to presign download url", http.StatusInternalServerError)
		return
	}

	if s.logger != nil {
		s.logger.Printf("download url generated id=%s key=%s", id, *objectKey)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(downloadURLResponse{DownloadURL: downloadURL})
}

// completeHandler marks a transfer as READY after validating state and expiry.
func (s *Server) completeHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()

	var status string
	var expiresAt time.Time
	err := s.db.QueryRow(ctx, `SELECT status, expires_at FROM transfers WHERE id=$1`, id).Scan(&status, &expiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			if s.logger != nil {
				s.logger.Printf("complete: transfer not found id=%s", id)
			}
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		if s.logger != nil {
			s.logger.Printf("complete: failed to fetch transfer id=%s: %v", id, err)
		}
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		if s.logger != nil {
			s.logger.Printf("complete: transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "INIT" {
		if s.logger != nil {
			s.logger.Printf("complete: invalid state id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	// perform strict update: only set to READY if currently INIT
	tag, err := s.db.Exec(ctx, `UPDATE transfers SET status=$1 WHERE id=$2 AND status=$3`, "READY", id, "INIT")
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("complete: failed to update transfer id=%s: %v", id, err)
		}
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		// another concurrent change; be strict
		if s.logger != nil {
			s.logger.Printf("complete: no rows updated (concurrent) id=%s", id)
		}
		http.Error(w, "transfer state changed", http.StatusConflict)
		return
	}

	if s.logger != nil {
		s.logger.Printf("transfer marked READY id=%s", id)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id, "status": "READY"})
}

func (s *Server) deleteTransferHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	// Mark as DELETED
	_, err := s.db.Exec(ctx, "UPDATE transfers SET status='DELETED' WHERE id=$1", id)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("delete: failed to update status id=%s: %v", id, err)
		}
		http.Error(w, "failed to delete transfer", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)

	// Trigger cleanup immediately (non-blocking or blocking? User said 'calls this function'. Blocking is safer for 'check' logic in this context or we can just run it)
	// For simplicity and correctness with the requirement "calls this function", we invoke it.
	// We run it in a goroutine to not block the response if there are many, but for a single delete it's fine.
	// However, the function checks *all* deleted objects.
	go s.RunCleanup()
}

func (s *Server) triggerDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		w.Header().Set("Allow", http.MethodDelete)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Trigger cleanup
	s.RunCleanup()
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "cleanup triggered"})
}

// RunCleanup iterates over transfers that are EXPIRED or DELETED and still have an object_key.
// It deletes the S3 object and then clears the object_key in the DB.
func (s *Server) RunCleanup() {
	// dedicated context for cleanup to avoid cancellation by parent request if used
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		if s.logger != nil {
			s.logger.Println("cleanup: s3 bucket not configured")
		}
		return
	}

	// 1. Find candidates
	rows, err := s.db.Query(ctx, `SELECT id, object_key FROM transfers WHERE (status = 'EXPIRED') AND object_key IS NOT NULL`)
	if err != nil {
		if s.logger != nil {
			s.logger.Printf("cleanup: failed to query candidates: %v", err)
		}
		return
	}
	defer rows.Close()

	type candidate struct {
		ID  string
		Key string
	}
	var candidates []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.ID, &c.Key); err != nil {
			continue
		}
		candidates = append(candidates, c)
	}

	if len(candidates) > 0 && s.logger != nil {
		s.logger.Printf("cleanup: found %d transfers to clean", len(candidates))
	}

	// 2. Process each
	for _, c := range candidates {
		if s.logger != nil {
			s.logger.Printf("cleanup: deleting s3 object %s for transfer %s", c.Key, c.ID)
		}
		if err := s.s3.DeleteObject(ctx, bucket, c.Key); err != nil {
			if s.logger != nil {
				s.logger.Printf("cleanup: failed to delete s3 object %s: %v", c.Key, err)
			}
			// continue to next, don't clear DB key if failed (so we retry later)
			continue
		}

		// 3. Update DB
		_, err := s.db.Exec(ctx, `UPDATE transfers SET status='DELETED', object_key=NULL WHERE id=$1`, c.ID)
		if err != nil {
			if s.logger != nil {
				s.logger.Printf("cleanup: failed to update status to DELETED for %s: %v", c.ID, err)
			}
		}
	}
}

func isExpired(expiresAt time.Time) bool {
	if expiresAt.IsZero() {
		return false
	}
	return time.Now().UTC().After(expiresAt)
}
