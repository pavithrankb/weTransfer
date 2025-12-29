package server

import (
	"encoding/json"
	"net/http"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", s.healthHandler)
	mux.HandleFunc("/transfers", s.createTransferHandler)
	mux.HandleFunc("/transfers/", s.transfersSubHandler)

	return mux
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, _ := json.Marshal(map[string]string{
		"status": "OK",
	})
	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonResp)
}
