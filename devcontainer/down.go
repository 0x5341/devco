package devcontainer

import (
	"errors"
	"os/exec"
)

type DownConfig struct {
	DockerPath string

	ContainerId        string
	ComposeProjectName string
}

func Down(c DownConfig) error {
	if c.ComposeProjectName != "" {
		var dpath string
		if c.DockerPath != "" {
			dpath = c.DockerPath
		} else {
			dpath = "docker"
		}
		err := exec.Command(dpath, "compose", "-p", c.ComposeProjectName, "down").Run()
		return err
	}

	if c.ContainerId != "" {
		var dpath string
		if c.DockerPath != "" {
			dpath = c.DockerPath
		} else {
			dpath = "docker"
		}
		err := exec.Command(dpath, "rm", "-f", c.ContainerId).Run()
		return err
	}

	return errors.New("cannnot find any compose project or container")
}
