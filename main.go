package main

import (
	"log"
	"os"
	"path"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "devco",
	Short: "devco, local codespace",
	RunE: func(cmd *cobra.Command, args []string) error {
		log.Printf("started on %s", address)
		serve(address)
		return nil
	},
}

var address string
var data_dir string

func init() {
	xdg_data := os.Getenv("XDG_DATA_HOME")
	if xdg_data == "" {
		xdg_data = "~/.local/share"
	}

	datadir := path.Join(xdg_data, "devco")

	rootCmd.Flags().StringVarP(&address, "address", "a", ":8000", "address that serve server")
	rootCmd.Flags().StringVarP(&data_dir, "datadir", "dd", datadir, "address that serve server")

	cobra.OnInitialize(func() {
		if needSetup(data_dir) {
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
