package server

import (
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
	ExpiresAt time.Time `json:"expires_at"`
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

	_, err = tx.Exec(ctx, `INSERT INTO transfers(id, expires_at, status, created_at) VALUES ($1, $2, $3, now())`, id, req.ExpiresAt, "INIT")
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
	action := parts[1]

	// method requirements: GET for download-url, POST for others
	if action == "download-url" {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			if s.logger != nil {
				s.logger.Printf("method not allowed for transfers download-url: %s %s", r.Method, r.URL.Path)
			}
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

	if status != "INIT" {
		if s.logger != nil {
			s.logger.Printf("transfer not in INIT state id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	if !expiresAt.IsZero() && expiresAt.Before(time.Now().UTC()) {
		if s.logger != nil {
			s.logger.Printf("transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		http.Error(w, "transfer expired", http.StatusGone)
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

	if status != "READY" {
		if s.logger != nil {
			s.logger.Printf("download: transfer not READY id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not ready", http.StatusBadRequest)
		return
	}

	if !expiresAt.IsZero() && expiresAt.Before(time.Now().UTC()) {
		if s.logger != nil {
			s.logger.Printf("download: transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		http.Error(w, "transfer expired", http.StatusGone)
		return
	}

	if objectKey == nil || strings.TrimSpace(*objectKey) == "" {
		if s.logger != nil {
			s.logger.Printf("download: missing object_key id=%s", id)
		}
		http.Error(w, "object not available", http.StatusBadRequest)
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

	if status != "INIT" {
		if s.logger != nil {
			s.logger.Printf("complete: invalid state id=%s status=%s", id, status)
		}
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	if !expiresAt.IsZero() && expiresAt.Before(time.Now().UTC()) {
		if s.logger != nil {
			s.logger.Printf("complete: transfer expired id=%s expires_at=%s", id, expiresAt)
		}
		http.Error(w, "transfer expired", http.StatusGone)
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
