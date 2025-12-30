package server

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Server) transfersRootHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		s.listTransfersHandler(w, r)
		return
	}
	if r.Method == http.MethodPost {
		s.createTransferHandler(w, r)
		return
	}
	w.Header().Set("Allow", "GET, POST")
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

type createTransferRequest struct {
	ExpiresAt    time.Time `json:"expires_at"`
	MaxDownloads *int      `json:"max_downloads"`
}

type createTransferResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type transferResponse struct {
	ID            string    `json:"id"`
	Status        string    `json:"status"`
	ExpiresAt     time.Time `json:"expires_at"`
	DownloadCount int       `json:"download_count"`
	MaxDownloads  int       `json:"max_downloads"`
	ObjectKey     *string   `json:"object_key"`
	CreatedAt     time.Time `json:"created_at"`
}

type updateTransferRequest struct {
	ExpiresAt    *time.Time `json:"expires_at"`
	MaxDownloads *int       `json:"max_downloads"`
	Status       *string    `json:"status"`
}

func (s *Server) createTransferHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		s.logger.Printf("method not allowed: %s %s", r.Method, r.URL.Path)
		return
	}

	var req createTransferRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		s.logger.Printf("invalid create transfer body: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if !req.ExpiresAt.After(time.Now().UTC()) {
		s.logger.Printf("invalid expires_at: %v", req.ExpiresAt)
		http.Error(w, "expires_at must be in the future", http.StatusBadRequest)
		return
	}

	maxDownloads := 1
	if req.MaxDownloads != nil {
		if *req.MaxDownloads < 1 {
			s.logger.Printf("invalid max_downloads: %d", *req.MaxDownloads)
			http.Error(w, "max_downloads must be >= 1", http.StatusBadRequest)
			return
		}
		maxDownloads = *req.MaxDownloads
	}

	id := uuid.New().String()

	ctx := r.Context()
	if s.debug {
		s.logger.Printf("creating transfer id=%s expires_at=%s", id, req.ExpiresAt)
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		s.logger.Printf("failed to start transaction: %v", err)
		http.Error(w, "failed to start transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `INSERT INTO transfers(id, expires_at, status, created_at, max_downloads) VALUES ($1, $2, $3, now(), $4)`, id, req.ExpiresAt, "INIT", maxDownloads)
	if err != nil {
		s.logger.Printf("failed to insert transfer: %v", err)
		http.Error(w, "failed to insert transfer", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		s.logger.Printf("failed to commit transaction: %v", err)
		http.Error(w, "failed to commit transaction", http.StatusInternalServerError)
		return
	}

	s.logger.Printf("transfer created id=%s", id)

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
		if s.debug {
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

	if action == "download-url" {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", http.MethodGet)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			s.logger.Printf("method not allowed for transfers download-url: %s %s", r.Method, r.URL.Path)
			return
		}
	} else if action == "" {
		// handle root /{id}
		switch r.Method {
		case http.MethodGet:
			s.getTransferHandler(w, r, id)
			return
		case http.MethodPatch:
			s.updateTransferHandler(w, r, id)
			return
		case http.MethodDelete:
			s.deleteTransferHandler(w, r, id)
			return
		default:
			w.Header().Set("Allow", "GET, PATCH, DELETE")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
	} else if action != "upload-url" && action != "complete" {
		http.NotFound(w, r)
		return
	} else {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			s.logger.Printf("method not allowed for transfers subroute: %s %s", r.Method, r.URL.Path)
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
		s.logger.Printf("invalid upload-url body: %v", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// filename validation
	if strings.TrimSpace(req.Filename) == "" || strings.Contains(req.Filename, "/") || strings.Contains(req.Filename, "..") {
		s.logger.Printf("invalid filename: %q", req.Filename)
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	var status string
	var expiresAt time.Time
	err := s.db.QueryRow(ctx, `SELECT status, expires_at FROM transfers WHERE id=$1`, id).Scan(&status, &expiresAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			s.logger.Printf("transfer not found id=%s", id)
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		s.logger.Printf("failed to fetch transfer id=%s: %v", id, err)
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		s.logger.Printf("transfer expired id=%s expires_at=%s", id, expiresAt)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "INIT" {
		s.logger.Printf("transfer not in INIT state id=%s status=%s", id, status)
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	objectKey := fmt.Sprintf("uploads/%s/%s", id, req.Filename)

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		s.logger.Printf("s3 bucket not configured")
		http.Error(w, "s3 bucket not configured", http.StatusInternalServerError)
		return
	}

	uploadURL, err := s.s3.PresignPutURL(ctx, bucket, objectKey, req.ContentType, 5*time.Minute)
	if err != nil {
		s.logger.Printf("failed to presign upload url id=%s key=%s: %v", id, objectKey, err)
		http.Error(w, "failed to presign upload url", http.StatusInternalServerError)
		return
	}

	// persist object_key
	_, err = s.db.Exec(ctx, `UPDATE transfers SET object_key=$1 WHERE id=$2`, objectKey, id)
	if err != nil {
		s.logger.Printf("failed to update transfer id=%s: %v", id, err)
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	s.logger.Printf("presigned upload url generated id=%s key=%s", id, objectKey)

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
			s.logger.Printf("download: transfer not found id=%s", id)
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		s.logger.Printf("download: failed to fetch transfer id=%s: %v", id, err)
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		s.logger.Printf("download: transfer expired id=%s expires_at=%s", id, expiresAt)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "READY" {
		s.logger.Printf("download: transfer not READY id=%s status=%s", id, status)
		http.Error(w, "transfer not ready", http.StatusBadRequest)
		return
	}

	if objectKey == nil || strings.TrimSpace(*objectKey) == "" {
		s.logger.Printf("download: missing object_key id=%s", id)
		http.Error(w, "object not available", http.StatusBadRequest)
		return
	}

	// atomic increment download_count
	// we enforce max_downloads here by conditioning the update
	tag, err := s.db.Exec(ctx, `UPDATE transfers SET download_count = download_count + 1 WHERE id=$1 AND download_count < max_downloads`, id)
	if err != nil {
		s.logger.Printf("download: failed to increment count id=%s: %v", id, err)
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		s.logger.Printf("download: limit reached id=%s", id)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_limit_reached"})
		return
	}

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		s.logger.Printf("download: s3 bucket not configured")
		http.Error(w, "s3 bucket not configured", http.StatusInternalServerError)
		return
	}

	downloadURL, err := s.s3.PresignGetURL(ctx, bucket, *objectKey, 5*time.Minute)
	if err != nil {
		s.logger.Printf("download: failed to presign get url id=%s key=%s: %v", id, *objectKey, err)
		http.Error(w, "failed to presign download url", http.StatusInternalServerError)
		return
	}

	s.logger.Printf("download url generated id=%s key=%s", id, *objectKey)

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
			s.logger.Printf("complete: transfer not found id=%s", id)
			http.Error(w, "transfer not found", http.StatusNotFound)
			return
		}
		s.logger.Printf("complete: failed to fetch transfer id=%s: %v", id, err)
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(expiresAt) {
		if status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		s.logger.Printf("complete: transfer expired id=%s expires_at=%s", id, expiresAt)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	if status != "INIT" {
		s.logger.Printf("complete: invalid state id=%s status=%s", id, status)
		http.Error(w, "transfer not in INIT state", http.StatusBadRequest)
		return
	}

	// perform strict update: only set to READY if currently INIT
	tag, err := s.db.Exec(ctx, `UPDATE transfers SET status=$1 WHERE id=$2 AND status=$3`, "READY", id, "INIT")
	if err != nil {
		s.logger.Printf("complete: failed to update transfer id=%s: %v", id, err)
		http.Error(w, "failed to update transfer", http.StatusInternalServerError)
		return
	}

	if tag.RowsAffected() == 0 {
		// another concurrent change; be strict
		s.logger.Printf("complete: no rows updated (concurrent) id=%s", id)
		http.Error(w, "transfer state changed", http.StatusConflict)
		return
	}

	s.logger.Printf("transfer marked READY id=%s", id)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id, "status": "READY"})
}

func (s *Server) getTransferHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	var t transferResponse
	err := s.db.QueryRow(ctx, `SELECT id, status, expires_at, download_count, max_downloads, object_key, created_at FROM transfers WHERE id=$1`, id).
		Scan(&t.ID, &t.Status, &t.ExpiresAt, &t.DownloadCount, &t.MaxDownloads, &t.ObjectKey, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		if err == pgx.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		s.logger.Printf("get: failed to fetch transfer id=%s: %v", id, err)
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if isExpired(t.ExpiresAt) {
		if t.Status != "EXPIRED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, id)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusGone)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "transfer_expired"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	s.logger.Printf("fetched transfer id=%s", t.ID)
	_ = json.NewEncoder(w).Encode(t)
}

func (s *Server) updateTransferHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()

	// 1. Check status
	var status string
	err := s.db.QueryRow(ctx, "SELECT status FROM transfers WHERE id=$1", id).Scan(&status)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	if status == "INIT" || status == "DELETED" {
		http.Error(w, "transfer cannot be updated in current state", http.StatusConflict)
		return
	}

	var req updateTransferRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate inputs
	if req.ExpiresAt != nil {
		if !req.ExpiresAt.After(time.Now().UTC()) {
			http.Error(w, "expires_at must be in the future", http.StatusBadRequest)
			return
		}
	}
	if req.MaxDownloads != nil {
		if *req.MaxDownloads < 1 {
			http.Error(w, "max_downloads must be >= 1", http.StatusBadRequest)
			return
		}
	}
	if req.Status != nil {
		st := *req.Status
		if st != "EXPIRED" {
			http.Error(w, "status can only be updated to 'EXPIRED'", http.StatusBadRequest)
			return
		}
	}

	// Build query dynamically
	var updates []string
	var args []interface{}
	idx := 1

	if req.ExpiresAt != nil {
		updates = append(updates, fmt.Sprintf("expires_at=$%d", idx))
		args = append(args, *req.ExpiresAt)
		idx++

		// If currently EXPIRED and we are extending expiry, revive to READY
		if status == "EXPIRED" {
			updates = append(updates, "status='READY'")
		}
	}
	if req.MaxDownloads != nil {
		updates = append(updates, fmt.Sprintf("max_downloads=$%d", idx))
		args = append(args, *req.MaxDownloads)
		idx++
	}
	if req.Status != nil {
		// Only apply if not already overridden by revival logic (which sets READY)
		statusTouched := false
		for _, u := range updates {
			if strings.HasPrefix(u, "status=") {
				statusTouched = true
				break
			}
		}
		if !statusTouched {
			updates = append(updates, fmt.Sprintf("status=$%d", idx))
			args = append(args, *req.Status)
			idx++
		}
	}

	if len(updates) > 0 {
		query := fmt.Sprintf("UPDATE transfers SET %s WHERE id=$%d", strings.Join(updates, ", "), idx)
		args = append(args, id)
		_, err := s.db.Exec(ctx, query, args...)
		if err != nil {
			s.logger.Printf("update: failed to update transfer id=%s: %v", id, err)
			http.Error(w, "failed to update transfer", http.StatusInternalServerError)
			return
		}
	}

	// Return updated status (which might be READY now or EXPIRED)
	newStatus := status
	if status == "EXPIRED" && req.ExpiresAt != nil {
		newStatus = "READY"
	}
	if req.Status != nil {
		newStatus = *req.Status
	}

	w.Header().Set("Content-Type", "application/json")
	s.logger.Printf("updated transfer id=%s status=%s", id, newStatus)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id, "status": newStatus})
}

func (s *Server) deleteTransferHandler(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()

	var status string
	var objectKey *string
	err := s.db.QueryRow(ctx, "SELECT status, object_key FROM transfers WHERE id=$1", id).Scan(&status, &objectKey)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		http.Error(w, "failed to fetch transfer", http.StatusInternalServerError)
		return
	}

	// If object exists: Delete S3 object (best effort)
	if objectKey != nil && *objectKey != "" {
		bucket := os.Getenv("S3_BUCKET")
		if bucket != "" {
			if err := s.s3.DeleteObject(ctx, bucket, *objectKey); err != nil {
				s.logger.Printf("delete: failed to delete s3 object %s: %v", *objectKey, err)
			}
		}
	}

	// Delete DB entry (Hard Delete)
	_, err = s.db.Exec(ctx, "DELETE FROM transfers WHERE id=$1", id)
	if err != nil {
		s.logger.Printf("delete: failed to delete transfer id=%s: %v", id, err)
		http.Error(w, "failed to delete transfer", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
	s.logger.Printf("deleted transfer id=%s", id)
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

type listTransfersResponse struct {
	Items  []transferResponse `json:"items"`
	Limit  int                `json:"limit"`
	Offset int                `json:"offset"`
}

func (s *Server) listTransfersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query()
	statusFilter := query.Get("status")
	limitVal := 50
	offsetVal := 0

	if l := query.Get("limit"); l != "" {
		var err error
		limitVal, err = strconv.Atoi(l)
		if err != nil || limitVal < 1 || limitVal > 100 {
			http.Error(w, "invalid limit (1-100)", http.StatusBadRequest)
			return
		}
	}
	if o := query.Get("offset"); o != "" {
		var err error
		offsetVal, err = strconv.Atoi(o)
		if err != nil || offsetVal < 0 {
			http.Error(w, "invalid offset", http.StatusBadRequest)
			return
		}
	}
	s.logger.Printf("listing transfers status=%s limit=%d offset=%d", statusFilter, limitVal, offsetVal)

	ctx := r.Context()
	var sqlStr strings.Builder
	var args []interface{}
	idx := 1

	sqlStr.WriteString(`SELECT id, status, expires_at, download_count, max_downloads, created_at FROM transfers`)

	if statusFilter != "" {
		sqlStr.WriteString(fmt.Sprintf(" WHERE status=$%d", idx))
		args = append(args, statusFilter)
		idx++
	}

	sqlStr.WriteString(" ORDER BY created_at DESC")

	sqlStr.WriteString(fmt.Sprintf(" LIMIT $%d OFFSET $%d", idx, idx+1))
	args = append(args, limitVal, offsetVal)

	rows, err := s.db.Query(ctx, sqlStr.String(), args...)
	if err != nil {
		s.logger.Printf("list: failed to query transfers: %v", err)
		http.Error(w, "failed to list transfers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []transferResponse{}
	for rows.Next() {
		var t transferResponse
		// object_key not selected, so expected to be nil/empty in struct or we just ignore it
		if err := rows.Scan(&t.ID, &t.Status, &t.ExpiresAt, &t.DownloadCount, &t.MaxDownloads, &t.CreatedAt); err != nil {
			continue
		}

		// Lazy expiry check
		if isExpired(t.ExpiresAt) && t.Status != "EXPIRED" && t.Status != "DELETED" {
			_, _ = s.db.Exec(ctx, `UPDATE transfers SET status='EXPIRED' WHERE id=$1`, t.ID)
			t.Status = "EXPIRED"
		}

		items = append(items, t)
	}

	if items == nil {
		items = []transferResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(listTransfersResponse{
		Items:  items,
		Limit:  limitVal,
		Offset: offsetVal,
	})
}

func (s *Server) RunCleanup() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	bucket := os.Getenv("S3_BUCKET")
	if bucket == "" {
		s.logger.Println("cleanup: s3 bucket not configured")
		return
	}

	// 1. Find candidates
	rows, err := s.db.Query(ctx, `SELECT id, object_key FROM transfers WHERE (status = 'EXPIRED') AND object_key IS NOT NULL`)
	if err != nil {
		s.logger.Printf("cleanup: failed to query candidates: %v", err)
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

	if len(candidates) > 0 {
		s.logger.Printf("cleanup: found %d transfers to clean", len(candidates))
	}

	// 2. Process each
	for _, c := range candidates {
		s.logger.Printf("cleanup: deleting s3 object %s for transfer %s", c.Key, c.ID)
		if err := s.s3.DeleteObject(ctx, bucket, c.Key); err != nil {
			s.logger.Printf("cleanup: failed to delete s3 object %s: %v", c.Key, err)
			// continue to next, don't clear DB key if failed (so we retry later)
			continue
		}

		// 3. Update DB
		_, err := s.db.Exec(ctx, `UPDATE transfers SET status='DELETED', object_key=NULL WHERE id=$1`, c.ID)
		if err != nil {
			s.logger.Printf("cleanup: failed to update status to DELETED for %s: %v", c.ID, err)
		}
	}
}

func isExpired(expiresAt time.Time) bool {
	if expiresAt.IsZero() {
		return false
	}
	return time.Now().UTC().After(expiresAt)
}
