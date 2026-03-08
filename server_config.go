package main

import (
	"encoding/json"
	"net/http"
)

func serveConfigAPI(conf config) {
	serveGetConfigAPI(conf)
}

func serveGetConfigAPI(conf config) {
	http.HandleFunc("GET /api/config", func(w http.ResponseWriter, r *http.Request) {
		b, err := json.Marshal(conf)
		if err != nil {
			errPrint(w, http.StatusInternalServerError, "error encode config: %s", err)
			return
		}

		w.Write(b)
	})
}
