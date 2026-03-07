package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path"
)

func jsonHelper[T any](w http.ResponseWriter) func(v T, err error) (T, bool) {
	return func(v T, err error) (T, bool) {
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "%s", err)
			var r T
			return r, false
		}
		return v, true
	}
}

func loadProjectsJsonRaw(datadir string) ([]byte, error) {
	pjpath := path.Join(datadir, "projects.json")
	file, err := os.ReadFile(pjpath)
	if err != nil {
		return nil, fmt.Errorf("error read projects.json: %s", err)
	}
	return file, nil
}

func loadProjectsJson(datadir string) (projectsJson, error) {
	file, err := loadProjectsJsonRaw(datadir)
	if err != nil {
		return projectsJson{}, err
	}

	var j projectsJson
	err = json.Unmarshal(file, &j)
	if err != nil {
		return projectsJson{}, fmt.Errorf("error decode projects.json: %s", err)
	}

	return j, nil
}

func writeProjectsJson(datadir string, data projectsJson) (struct{}, error) {
	j, err := json.Marshal(data)
	if err != nil {
		return struct{}{}, fmt.Errorf("error encode projects.json: %s", err)
	}

	err = os.WriteFile(path.Join(datadir, "projects.json"), j, os.ModePerm)
	if err != nil {
		return struct{}{}, fmt.Errorf("error write projects.json: %s", err)
	}
	return struct{}{}, nil
}
