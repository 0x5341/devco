package main

import (
	"log"
	"os"

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

func init() {
	rootCmd.Flags().StringVarP(&address, "address", "a", ":8000", "address that serve server")
}

func main() {
	err := rootCmd.Execute()
	if err != nil {
		log.Fatalf("execute error: %s", err)
		os.Exit(1)
	}
}
