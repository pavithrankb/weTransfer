package server

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pavithrankb/weTransfer/internal/storage"
)

type Server struct {
	port   int
	db     *pgxpool.Pool
	s3     *storage.S3
	logger *log.Logger
	debug  bool
}

func NewServer(db *pgxpool.Pool, s3h *storage.S3, logger *log.Logger, debug bool) *http.Server {
	port := 8080
	s := &Server{
		port:   port,
		db:     db,
		s3:     s3h,
		logger: logger,
		debug:  debug,
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", s.port),
		Handler:      s.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}
