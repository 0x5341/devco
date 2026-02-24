package main

import (
	"os"
	"path"
)

func setup(datadir string) error {
	err := os.MkdirAll(datadir, os.ModePerm)
	if err != nil {
		return err
	}

	err = os.MkdirAll(path.Join(datadir, "worktree"), os.ModePerm)
	if err != nil {
		return err
	}

	file, err := os.Create(path.Join(datadir, "projects.json"))
	if err != nil {
		return err
	}
	defer file.Close()

	file.WriteString(`{}`)

	return nil
}

func needSetup(datadir string) bool {
	_, err := os.Stat(datadir)
	return err != nil
}
