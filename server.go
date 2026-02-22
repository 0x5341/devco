package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
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
	http.HandleFunc("GET /api/projects", func(w http.ResponseWriter, r *http.Request) {
		pjpath := path.Join(datadir, "projects.json")
		file, err := os.ReadFile(pjpath)
		if err != nil {
			log.Printf("error read file `%s`: %s", pjpath, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_, err = w.Write(file)
		if err != nil {
			log.Printf("error response write: %s", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	})
}
