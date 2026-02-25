package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
)

func serve(addr string, datadir string) {
	serveUI()
	serveAPI(datadir)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("serve error: %s", err)
	}
}

func serveUI() {
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
}

func serveAPI(datadir string) {
	serveProjectAPI(datadir)
	serveWorkspaceAPI(datadir)
	serveContainerAPI(datadir)
}

func errPrint(w http.ResponseWriter, code int, fmtstr string, v ...any) {
	w.WriteHeader(code)
	fmt.Fprintf(w, fmtstr, v...)
	log.Printf(fmtstr, v...)
}
