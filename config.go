package main

type projectsJson map[string]struct {
	path       string
	workspaces map[string]projectsJsonWorkspace
}

type projectsJsonWorkspace struct {
	state       workspaceState
	containerId string
}

type workspaceState string

const (
	stateBeforeStart workspaceState = "beforeStart"
	stateRunning     workspaceState = "running"
	stateStopped     workspaceState = "stopped"
)
