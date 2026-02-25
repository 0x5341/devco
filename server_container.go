package main

import (
	"encoding/json"
	"net/http"

	"github.com/0x5341/devco/devcontainer"
)

func serveContainerAPI(datadir string) {
	serveLaunchContainerAPI(datadir)
	serveDownContainerAPI(datadir)
}

func serveLaunchContainerAPI(datadir string) {
	type conf struct {
		ProjectName   string
		WorkspaceName string
	}
	http.HandleFunc("POST /api/workspace/launch", func(w http.ResponseWriter, r *http.Request) {
		var c conf
		err := json.NewDecoder(r.Body).Decode(&c)
		if err != nil {
			errPrint(w, http.StatusBadRequest, "error decode request body: %s", err)
			return
		}

		js, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok = js[c.ProjectName]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` not exists", c.ProjectName)
			return
		}

		if _, ok = js[c.ProjectName].Workspaces[c.WorkspaceName]; !ok {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` not exists in project `%s`", c.WorkspaceName, c.ProjectName)
			return
		}

		if js[c.ProjectName].Workspaces[c.WorkspaceName].State == stateRunning {
			errPrint(w, http.StatusBadRequest, "error container already launched in workspace `%s`", c.WorkspaceName)
			return
		}

		res, err := devcontainer.Up(devcontainer.UpConfig{
			WorkspaceFolder: js[c.ProjectName].Workspaces[c.WorkspaceName].Path,
		})
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error launch container: %s", err)
			return
		}

		ws := js[c.ProjectName].Workspaces[c.WorkspaceName]
		ws.State = stateRunning
		ws.ComposeProjectName = res.ComposeProjectName
		ws.ContainerId = res.ContainerId
		ws.RemoteUser = res.RemoteUser
		ws.RemoteWorkspaceFolder = res.RemoteWorkspaceFolder
		js[c.ProjectName].Workspaces[c.WorkspaceName] = ws

		ok = writeProjectsJson(datadir, js, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func serveDownContainerAPI(datadir string) {
	type conf struct {
		ProjectName   string
		WorkspaceName string
	}
	http.HandleFunc("POST /api/workspace/down", func(w http.ResponseWriter, r *http.Request) {
		var c conf
		err := json.NewDecoder(r.Body).Decode(&c)
		if err != nil {
			errPrint(w, http.StatusBadRequest, "error decode request body: %s", err)
			return
		}

		js, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok = js[c.ProjectName]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` not exists", c.ProjectName)
			return
		}

		if _, ok = js[c.ProjectName].Workspaces[c.WorkspaceName]; !ok {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` not exists in project `%s`", c.WorkspaceName, c.ProjectName)
			return
		}

		if js[c.ProjectName].Workspaces[c.WorkspaceName].State != stateRunning {
			errPrint(w, http.StatusBadRequest, "error container already stopped in workspace `%s`", c.WorkspaceName)
			return
		}

		err = devcontainer.Down(devcontainer.DownConfig{
			ComposeProjectName: js[c.ProjectName].Workspaces[c.WorkspaceName].ComposeProjectName,
			ContainerId:        js[c.ProjectName].Workspaces[c.WorkspaceName].ContainerId,
		})
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error stop container: %s", err)
			return
		}

		ws := js[c.ProjectName].Workspaces[c.WorkspaceName]
		ws.State = stateBeforeStart
		js[c.ProjectName].Workspaces[c.WorkspaceName] = ws

		ok = writeProjectsJson(datadir, js, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}
