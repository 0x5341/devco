package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
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

	ch := make(chan struct{})

	server.RegisterOnShutdown(func() {
		jsonpath := path.Join(datadir, "projects.json")
		file, err := os.ReadFile(jsonpath)
		if err != nil {
			log.Printf("failed shutdown (fail to read projects.json): %s", err)
			return
		}

		var js projectsJson
		err = json.Unmarshal(file, &js)
		if err != nil {
			log.Printf("failed shutdown (fail to parse projects.json): %s", err)
			return
		}

		for pn, p := range js {
			for wn, w := range p.Workspaces {
				if w.State != stateRunning {
					continue
				}
				err := downContainer(&js, pn, wn)
				if err != nil {
					log.Printf("failed shutdown (fail to down container on workspace `%s` in project `%s`)", wn, pn)
					log.Printf("shutdown continue...")
				}
			}
		}

		b, err := json.Marshal(js)
		if err != nil {
			log.Printf("failed shutdown (fail to marshal json): %s", err)
			return
		}

		err = os.WriteFile(jsonpath, b, os.ModePerm)
		if err != nil {
			log.Printf("failed shutdown (fail to write projects.json): %s", err)
			return
		}

		log.Printf("`downContainer` shutdown finished")
		ch <- struct{}{}
	})

	go func() {
		if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve error: %s", err)
		}
	}()
	<-sig.Done()

	log.Printf("start graceful shutdown...")
	err := server.Shutdown(context.Background())
	if err != nil {
		log.Fatalf("failed shutdown: %s", err)
	}
	<-ch

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
