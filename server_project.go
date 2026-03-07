package main

import (
	"encoding/json"
	"net/http"
)

func serveProjectAPI(datadir string) {
	serveGetProjectAPI(datadir)
	servePostProjectAPI(datadir)
	serveDeleteProjectAPI(datadir)
}

func serveGetProjectAPI(datadir string) {
	http.HandleFunc("GET /api/project", func(w http.ResponseWriter, r *http.Request) {
		file, ok := jsonHelper[[]byte](w)(loadProjectsJsonRaw(datadir))
		if !ok {
			return
		}

		_, err := w.Write(file)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error response write: %s", err)
			return
		}
	})
}

func servePostProjectAPI(datadir string) {
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

		file, ok := jsonHelper[projectsJson](w)(loadProjectsJson(datadir))
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

		_, ok = jsonHelper[struct{}](w)(writeProjectsJson(datadir, file))
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func serveDeleteProjectAPI(datadir string) {
	http.HandleFunc("DELETE /api/project", func(w http.ResponseWriter, r *http.Request) {
		if !r.URL.Query().Has("pjname") {
			errPrint(w, http.StatusBadRequest, "error get pjname")
			return
		}
		pjname := r.URL.Query().Get("pjname")

		json, ok := jsonHelper[projectsJson](w)(loadProjectsJson(datadir))
		if !ok {
			return
		}

		if _, ok = json[pjname]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` is not found", pjname)
			return
		}

		delete(json, pjname)

		_, ok = jsonHelper[struct{}](w)(writeProjectsJson(datadir, json))
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}
