package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"os/exec"

	"github.com/0x5341/devco/devcontainer"
)

func serveContainerAPI(datadir string, conf config) {
	serveLaunchContainerAPI(datadir, conf)
	serveDownContainerAPI(datadir)
	serveGetOpenLinksAPI(datadir)
}

func serveLaunchContainerAPI(datadir string, cf config) {
	type conf struct {
		ProjectName   string
		WorkspaceName string
		Plugins       []string
	}
	http.HandleFunc("POST /api/workspace/launch", func(w http.ResponseWriter, r *http.Request) {
		var c conf
		err := json.NewDecoder(r.Body).Decode(&c)
		if err != nil {
			errPrint(w, http.StatusBadRequest, "error decode request body: %s", err)
			return
		}

		js, ok := jsonHelper[projectsJson](w)(loadProjectsJson(datadir))
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

		for _, s := range c.Plugins {
			if _, ok := cf.Plugins[s]; !ok {
				errPrint(w, http.StatusBadRequest, "error plugin `%s` is not exist", s)
				return
			}
		}

		features := make(map[string]map[string]any)
		for _, name := range c.Plugins {
			maps.Copy(features, cf.Plugins[name].Features)
		}

		res, err := devcontainer.Up(devcontainer.UpConfig{
			WorkspaceFolder:    js[c.ProjectName].Workspaces[c.WorkspaceName].Path,
			AdditionalFeatures: features,
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

		ws.OpenLinks = make(map[string]link)
		for _, name := range c.Plugins {
			maps.Copy(ws.OpenLinks, cf.Plugins[name].Links)
		}

		addr, err := getIPAddress(res.ContainerId)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error get IPAddress: %s", err)
			return
		}
		ws.IPAddress = addr
		js[c.ProjectName].Workspaces[c.WorkspaceName] = ws

		_, ok = jsonHelper[struct{}](w)(writeProjectsJson(datadir, js))
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

		js, ok := jsonHelper[projectsJson](w)(loadProjectsJson(datadir))
		if !ok {
			return
		}

		err = downContainer(&js, c.ProjectName, c.WorkspaceName)
		if err != nil {
			errPrint(w, http.StatusNotFound, "error during down container: %s", err)
			return
		}

		_, ok = jsonHelper[struct{}](w)(writeProjectsJson(datadir, js))
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func serveGetOpenLinksAPI(datadir string) {
	http.HandleFunc("GET /api/workspace/openlink", func(w http.ResponseWriter, r *http.Request) {
		checkParam := func(name string) bool {
			if !r.URL.Query().Has(name) {
				errPrint(w, http.StatusBadRequest, "error paramater `%s` is not exist", name)
				return false
			}
			return true
		}

		for _, p := range []string{"pjname", "wsname"} {
			if !checkParam(p) {
				return
			}
		}

		pjname := r.URL.Query().Get("pjname")
		wsname := r.URL.Query().Get("wsname")

		js, ok := jsonHelper[projectsJson](w)(loadProjectsJson(datadir))
		if !ok {
			return
		}

		if _, ok := js[pjname]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` is not exist", pjname)
			return
		}

		if _, ok := js[pjname].Workspaces[wsname]; !ok {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` is not exist in project `%s`", wsname, pjname)
			return
		}

		if js[pjname].Workspaces[wsname].State != stateRunning {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` is not running", wsname)
		}

		links := js[pjname].Workspaces[wsname].OpenLinks

		b, err := json.Marshal(links)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error encode openlink")
			return
		}

		w.Write(b)
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
