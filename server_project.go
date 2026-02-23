package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path"
)

func serveProjectAPI(datadir string) {
	serveGetProjectAPI(datadir)
	servePostProjectAPI(datadir)
	serveDeleteProjectAPI(datadir)
}

func serveGetProjectAPI(datadir string) {
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

func serveDeleteProjectAPI(datadir string) {
	http.HandleFunc("DELETE /api/project", func(w http.ResponseWriter, r *http.Request) {
		if !r.URL.Query().Has("pjname") {
			errPrint(w, http.StatusBadRequest, "error get pjname")
			return
		}
		pjname := r.URL.Query().Get("pjname")

		json, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok = json[pjname]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` is not found", pjname)
			return
		}

		delete(json, pjname)

		ok = writeProjectsJson(datadir, json, w)
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
