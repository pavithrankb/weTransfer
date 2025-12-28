package main

import (
	"fmt"

	"github.com/pavithrankb/weTransfer/internal/server"
)

func main() {
	server := server.NewServer()

	fmt.Println("Server listening on port 8080...")
	err := server.ListenAndServe()
	if err != nil {
		panic(fmt.Sprintf("cannot start server: %s", err))
	}
}
