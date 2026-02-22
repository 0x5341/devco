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
	Run: func(cmd *cobra.Command, args []string) {
		log.Printf("started on %s", address)
		serve(address, data_dir)
	},
}

var address string
var data_dir string

func init() {
	xdg_data := os.Getenv("XDG_DATA_HOME")
	if xdg_data == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatalf("cannot get user home directory: %s", err)
		}
		xdg_data = path.Join(home, ".local/share/devco")
	}

	rootCmd.Flags().StringVarP(&address, "address", "a", ":8000", "address that serve server")
	rootCmd.Flags().StringVar(&data_dir, "datadir", xdg_data, "address that serve server")

	cobra.OnInitialize(func() {
		log.Println("start initialize")
		if needSetup(data_dir) {
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
