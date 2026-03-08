package main

type config struct {
	Plugins map[string]plugin
}

type plugin struct {
	Features map[string]map[string]any // bool or string
	Links    map[string]link
}

type link struct {
	Port int // 0 means "not need open button"
	Path string
}
