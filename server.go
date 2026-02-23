package main

import (
	"encoding/json"
	"fmt"
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
	http.HandleFunc("GET /api/project", func(w http.ResponseWriter, r *http.Request) {
		file, ok := loadProjectsJsonRaw(datadir, w)
		if !ok {
			return
		}

		_, err := w.Write(file)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error response write: %s", err)
			return
		}
	})

	type createProjectRequest struct {
		Name string
		Path string
	}

	http.HandleFunc("POST /api/project", func(w http.ResponseWriter, r *http.Request) {
		var c createProjectRequest
		err := json.NewDecoder(r.Body).Decode(&c)
		if err != nil {
			errPrint(w, http.StatusBadRequest, "error decode json: %s", err)
			return
		}

		file, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok := file[c.Name]; ok {
			errPrint(w, http.StatusBadRequest, "error add project: project `%s` exists", c.Name)
			return
		}

		file[c.Name] = projectsJsonProject{
			Path:       c.Path,
			Workspaces: map[string]projectsJsonWorkspace{},
		}

		ok = writeProjectsJson(datadir, file, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func loadProjectsJsonRaw(datadir string, w http.ResponseWriter) ([]byte, bool) {
	pjpath := path.Join(datadir, "projects.json")
	file, err := os.ReadFile(pjpath)
	if err != nil {
		errPrint(w, http.StatusInternalServerError, "error read projects.json: %s", err)
		return nil, false
	}
	return file, true
}

func loadProjectsJson(datadir string, w http.ResponseWriter) (projectsJson, bool) {
	file, ok := loadProjectsJsonRaw(datadir, w)
	if !ok {
		return projectsJson{}, false
	}

	var j projectsJson
	err := json.Unmarshal(file, &j)
	if err != nil {
		errPrint(w, http.StatusInternalServerError, "error decode projects.json: %s", err)
		return projectsJson{}, false
	}

	return j, true
}

func writeProjectsJson(datadir string, data projectsJson, w http.ResponseWriter) bool {
	j, err := json.Marshal(data)
	if err != nil {
		errPrint(w, http.StatusInternalServerError, "error encode projects.json: %s", err)
		return false
	}

	err = os.WriteFile(path.Join(datadir, "projects.json"), j, os.ModePerm)
	if err != nil {
		errPrint(w, http.StatusInternalServerError, "error write projects.json: %s", err)
		return false
	}
	return true
}

func errPrint(w http.ResponseWriter, code int, fmtstr string, v ...any) {
	w.WriteHeader(code)
	fmt.Fprintf(w, fmtstr, v...)
	log.Printf(fmtstr, v...)
}
