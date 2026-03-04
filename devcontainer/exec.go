package devcontainer

import (
	"os/exec"
)

func Exec(workspace string, cmd string, args ...string) *exec.Cmd {
	c := exec.Command(devcontainerCliPath, append([]string{"exec", "--workspace-folder", workspace, cmd}, args...)...)
	return c
}
