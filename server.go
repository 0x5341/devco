package main

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"
)

func serve(addr string, datadir string) {
	serveUI()
	serveAPI(datadir)

	sig, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	server := &http.Server{
		Addr:    addr,
		Handler: nil,
	}

	go func() {
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve error: %s", err)
		}
	}()
	<-sig.Done()

	log.Printf("start graceful shutdown...")

	timeout, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	server.Shutdown(timeout)

	log.Printf("finished graceful shutdown")
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
