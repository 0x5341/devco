package main

import (
	"embed"
	"io/fs"
)

//go:embed ui/dist/*
var f embed.FS
var dist fs.FS

func init() {
	d, err := fs.Sub(f, "ui/dist")
	if err != nil {
		panic(err)
	}

	dist = d
}
