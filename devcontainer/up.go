package devcontainer

import (
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// config of [Up]
type UpConfig struct {
	// docker path (if needed)
	DockerPath string
	// docker compose path (if needed)
	DockerComposePath string
	// workspace path.
	// default: current directory
	WorkspaceFolder string
	// config path (like .devcontainer/devcontainer.json)
	// default: devcontainer.json found in workspace
	ConfigPath string
	// override config path
	// (used when there is no devcontainer.json otherwise)
	OverrideConfigPath string
	// additional mounts
	AdditionalMounts []MountConfig
	// additional features
	AdditionalFeatures []FeatureConfig
}

type UpResult struct {
	// command result
	Outcome               string
	ContainerId           string
	ComposeProjectName    string
	RemoteUser            string
	RemoteWorkspaceFolder string
}

// start devcontainer with [UpConfig]
func Up(c UpConfig) (r UpResult, err error) {
	out, err := exec.Command(devcontainerCliPath, buildUpOption(c)...).Output()
	if err != nil {
		return
	}
	js := string(out)
	jindex := strings.Index(js, "{")
	if jindex == -1 {
		err = errors.New("not found result json")
		return
	}
	js = js[jindex:]
	if err = json.Unmarshal([]byte(js), &r); err != nil {
		return
	}
	if r.Outcome != "success" {
		err = errors.New("failed to start container...")
		return
	}
	return
}

func buildUpOption(c UpConfig) (r []string) {
	if c.DockerPath != "" {
		r = append(r, "--docker-path", c.DockerPath)
	}

	if c.DockerComposePath != "" {
		r = append(r, "--docker-compose-path", c.DockerComposePath)
	}

	if c.WorkspaceFolder != "" {
		r = append(r, "--workspace-folder", c.WorkspaceFolder)
	}

	if c.ConfigPath != "" {
		r = append(r, "--config", c.ConfigPath)
	}

	if c.OverrideConfigPath != "" {
		r = append(r, "--override-config", c.OverrideConfigPath)
	}

	if c.AdditionalMounts != nil {
		for _, m := range c.AdditionalMounts {
			var ty string
			switch m.Type {
			case BindMount:
				ty = "bind"
			case VolumeMount:
				ty = "volume"
			}
			r = append(r, "--mount", fmt.Sprintf("type=%s,source=%s,target=%s,external=%t", ty, m.Source, m.Target, m.External))
		}
	}

	if c.AdditionalFeatures != nil {
		m := make(map[string]map[string]any)
		for _, f := range c.AdditionalFeatures {
			o := make(map[string]any)
			for k, v := range f.StringOptions {
				o[k] = v
			}
			for k, v := range f.BoolOptions {
				o[k] = v
			}
			m[f.Id] = o
		}
		js, err := json.Marshal(m)
		if err != nil {
			panic(fmt.Sprintf("internal json marshal error: %s", err))
		}

		r = append(r, "--additional-features", string(js))
	}

	r = append(r, "up")

	return
}
