package main

import (
	"encoding/json"
	"log"
	"os"
	"path"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "devco",
	Short: "devco, local codespace",
	Run: func(cmd *cobra.Command, args []string) {
		log.Printf("started on %s", address)
		serve(address, data_dir)
	},
}

var address string
var data_dir string
var config_path string

var conf config

func init() {
	xdg_data := os.Getenv("XDG_DATA_HOME")
	if xdg_data == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatalf("cannot get user home directory: %s", err)
		}
		xdg_data = path.Join(home, ".local/share")
	}
	data_dir_default := path.Join(xdg_data, "devco")

	xdg_config := os.Getenv("XDG_CONFIG_HOME")
	if xdg_config == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatalf("cannot get user home directory: %s", err)
		}
		xdg_config = path.Join(home, ".config")
	}
	config_path_default := path.Join(xdg_config, "devco/config.json")

	rootCmd.Flags().StringVarP(&address, "address", "a", ":8000", "address that serve server")
	rootCmd.Flags().StringVar(&data_dir, "datadir", data_dir_default, "directory that save data")
	rootCmd.Flags().StringVarP(&config_path, "config", "c", config_path_default, "path to the config file")

	cobra.OnInitialize(func() {
		// check config file
		if !exist(config_path) && config_path != config_path_default {
			log.Fatalf("config file `%s` is not exist", config_path)
		}

		if exist(config_path) {
			file, err := os.ReadFile(config_path)
			if err != nil {
				log.Fatalf("failed to read config file: %s", err)
			}

			err = json.Unmarshal(file, &conf)
			if err != nil {
				log.Fatalf("failed to parse config file: %s", err)
			}
		}

		log.Println("start initialize")
		if !exist(data_dir) {
			log.Println("setup required")
			err := setup(data_dir)
			if err != nil {
				log.Fatalf("error while setuping: %s", err)
			}
		}
	})
}

func main() {
	err := rootCmd.Execute()
	if err != nil {
		log.Fatalf("execute error: %s", err)
		os.Exit(1)
	}
}
