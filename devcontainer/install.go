package devcontainer

import (
	"os/exec"
)

var devcontainerCliPath string = "devcontainer"

func DetectDevcontainer() error {
	path, err := exec.LookPath("devcontainer")
	if err != nil {
		return nil
	}

	devcontainerCliPath = path
	return nil
}

func SetDevcontainerPath(path string) {
	devcontainerCliPath = path
}
