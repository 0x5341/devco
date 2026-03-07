package main

type config struct {
	Plugins []plugin
}

type plugin struct {
	Name     string
	Features map[string]map[string]any // bool or string
	Links    []link
}

type link struct {
	Port int // 0 means "not need open button"
	Path string
}
