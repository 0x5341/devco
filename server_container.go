package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os/exec"

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
		addr, err := getIPAddress(res.ContainerId)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error get IPAddress: %s", err)
			return
		}
		ws.IPAddress = addr
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

		err = downContainer(&js, c.ProjectName, c.WorkspaceName)
		if err != nil {
			errPrint(w, http.StatusNotFound, "error during down container: %s", err)
			return
		}

		ok = writeProjectsJson(datadir, js, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func downContainer(js *projectsJson, pjname string, wsname string) error {
	if _, ok := (*js)[pjname]; !ok {
		return fmt.Errorf("project `%s` not exists", pjname)
	}

	if _, ok := (*js)[pjname].Workspaces[wsname]; !ok {
		return fmt.Errorf("workspace `%s` not exists in project `%s`", wsname, pjname)
	}

	if (*js)[pjname].Workspaces[wsname].State != stateRunning {
		return fmt.Errorf("container already stopped in workspace `%s`", wsname)
	}

	err := devcontainer.Down(devcontainer.DownConfig{
		ComposeProjectName: (*js)[pjname].Workspaces[wsname].ComposeProjectName,
		ContainerId:        (*js)[pjname].Workspaces[wsname].ContainerId,
	})
	if err != nil {
		return fmt.Errorf("error stop container: %s", err)
	}

	ws := (*js)[pjname].Workspaces[wsname]
	ws.State = stateBeforeStart
	(*js)[pjname].Workspaces[wsname] = ws

	return nil
}

func getIPAddress(cid string) (string, error) {
	b, err := exec.Command("docker", "inspect", cid).Output()
	if err != nil {
		return "", err
	}

	type info []struct {
		NetworkSettings struct {
			Networks map[string]struct {
				IPAddress string
			}
		}
	}

	var i info
	err = json.Unmarshal(b, &i)
	if err != nil {
		return "", err
	}

	for _, net := range i[0].NetworkSettings.Networks {
		addr := net.IPAddress
		return addr, nil
	}

	return "", errors.New("IPAddress not found")
}
