package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path"
)

func serveWorkspaceAPI(datadir string) {
	servePostWorkspaceAPI(datadir)
	serveDeleteWorkspaceAPI(datadir)
}

func servePostWorkspaceAPI(datadir string) {
	type postWorkspaceConfig struct {
		ProjectName   string
		WorkspaceName string
		BranchName    string
	}

	http.HandleFunc("POST /api/workspace", func(w http.ResponseWriter, r *http.Request) {
		var c postWorkspaceConfig
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			errPrint(w, http.StatusBadRequest, "error decode request: %s", err)
			return
		}

		js, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok = js[c.ProjectName]; !ok {
			errPrint(w, http.StatusBadRequest, "error Project `%s` not found", c.ProjectName)
			return
		}

		var branchName string
		if c.BranchName != "" {
			branchName = c.BranchName
		} else {
			branchName = fmt.Sprintf("devco/%s", c.WorkspaceName)
		}

		pjwpath := path.Join(datadir, "worktree", c.ProjectName)
		err := os.MkdirAll(pjwpath, os.ModePerm)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error make directory")
			return
		}

		err = exec.Command("git", "-C", js[c.ProjectName].Path, "worktree", "add", "-b", branchName, path.Join(pjwpath, c.WorkspaceName)).Run()
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error execute `git worktree add`: %s", err)
			return
		}

		js[c.ProjectName].Workspaces[c.WorkspaceName] = projectsJsonWorkspace{
			State:       stateBeforeStart,
			BranchName:  branchName,
			ContainerId: "",
		}

		ok = writeProjectsJson(datadir, js, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}

func serveDeleteWorkspaceAPI(datadir string) {
	http.HandleFunc("DELETE /api/workspace", func(w http.ResponseWriter, r *http.Request) {
		if !r.URL.Query().Has("pjname") {
			errPrint(w, http.StatusBadRequest, "error `pjname` param not exists")
			return
		}

		if !r.URL.Query().Has("wsname") {
			errPrint(w, http.StatusBadRequest, "error `wsname` param not exists")
			return
		}

		pjname := r.URL.Query().Get("pjname")
		wsname := r.URL.Query().Get("wsname")

		js, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}

		if _, ok = js[pjname]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` not exists", pjname)
			return
		}

		if _, ok = js[pjname].Workspaces[wsname]; !ok {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` not exists in project `%s`", wsname, pjname)
			return
		}

		err := exec.Command("git", "-C", js[pjname].Path, "worktree", "remove", "-f", path.Join(datadir, "worktree", pjname, wsname)).Run()
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error remove worktree: %s", err)
			return
		}

		err = exec.Command("git", "-C", js[pjname].Path, "branch", "-d", js[pjname].Workspaces[wsname].BranchName).Run()
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error remove branch `%s`: %s", js[pjname].Workspaces[wsname].BranchName, err)
		}

		delete(js[pjname].Workspaces, wsname)

		ok = writeProjectsJson(datadir, js, w)
		if !ok {
			return
		}

		w.WriteHeader(http.StatusOK)
	})
}
