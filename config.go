package main

type projectsJson map[string]projectsJsonProject

type projectsJsonProject struct {
	Path       string
	Workspaces map[string]projectsJsonWorkspace
}

type projectsJsonWorkspace struct {
	State      workspaceState
	BranchName string
	Path       string

	ContainerId        string
	ComposeProjectName string

	RemoteUser            string
	RemoteWorkspaceFolder string

	IPAddress string
}

type workspaceState string

const (
	stateBeforeStart workspaceState = "beforeStart"
	stateRunning     workspaceState = "running"
	stateStopped     workspaceState = "stopped"
)
