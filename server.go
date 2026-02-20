package main

import (
	"io/fs"
	"log"
	"net/http"
	"strings"
)

func serve(addr string) {
	server := http.FileServerFS(dist)
	http.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			server.ServeHTTP(w, r)
			return
		}
		trimed := strings.TrimPrefix(r.URL.Path, "/")
		if _, err := fs.Stat(dist, trimed); err != nil {
			r.URL.Path = "/"
		}
		server.ServeHTTP(w, r)
	})

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("serve error: %s", err)
	}
}
