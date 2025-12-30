package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pavithrankb/weTransfer/internal/server"
	"github.com/pavithrankb/weTransfer/internal/storage"
)

func main() {
	// CLI flags
	logToTerminal := flag.Bool("logToTerminal", false, "also print logs to terminal")
	debugMode := flag.Bool("debugMode", false, "enable debug logs")
	flag.Parse()

	// prepare logger: always write to app.log and optionally to terminal
	f, err := os.OpenFile("app.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		panic(fmt.Sprintf("unable to open log file: %s", err))
	}
	defer f.Close()

	writers := []io.Writer{f}
	if *logToTerminal {
		writers = append(writers, os.Stdout)
	}
	mw := io.MultiWriter(writers...)
	logger := log.New(mw, "", log.LstdFlags|log.Lmicroseconds)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		logger.Panic("DATABASE_URL is not set")
	}

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		logger.Panicf("unable to create db pool: %s", err)
	}
	defer pool.Close()

	// initialize S3 helper
	s3h, err := storage.NewS3(ctx)
	if err != nil {
		logger.Panicf("unable to initialize s3 helper: %s", err)
	}

	srv := server.NewServer(pool, s3h, logger, *debugMode)

	// background cleanup job
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if *debugMode {
				logger.Println("starting background cleanup...")
			}
			srv.RunCleanup()
		}
	}()

	logger.Println("Server listening on port 8080...")
	if err := srv.ListenAndServe(); err != nil {
		logger.Panicf("cannot start server: %s", err)
	}
}
