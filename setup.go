package main

import (
	"os"
)

func setup(datadir string) error {
	err := os.MkdirAll(datadir, os.ModePerm)
	if err != nil {
		return err
	}
	return nil
}

func needSetup(datadir string) bool {
	_, err := os.Stat(datadir)
	return err == nil
}
