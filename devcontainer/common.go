package devcontainer

type MountConfig struct {
	// [MountType]. See Docker Document
	Type MountType
	// Mount Path in host(bind mount) or Volume Name(volume mount)
	Source string
	// target path in container
	Target string
	// use external volume in host
	// (feature like `external` of docker-compose)
	External bool
}

type MountType int

const (
	BindMount MountType = iota
	VolumeMount
)

type FeatureConfig struct {
	Id            string
	StringOptions map[string]string
	BoolOptions   map[string]bool
}
