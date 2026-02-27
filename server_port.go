package main

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func servePortAccessAPI(datadir string) {
	http.HandleFunc("/port/{pid}/{wid}/{port}/{rest...}", func(w http.ResponseWriter, r *http.Request) {
		js, ok := loadProjectsJson(datadir, w)
		if !ok {
			return
		}
		pid := r.PathValue("pid")
		wid := r.PathValue("wid")
		port := r.PathValue("port")
		rest := r.PathValue("rest")

		if _, ok = js[pid]; !ok {
			errPrint(w, http.StatusBadRequest, "error project `%s` not exists", pid)
			return
		}

		if _, ok = js[pid].Workspaces[wid]; !ok {
			errPrint(w, http.StatusBadRequest, "error workspace `%s` not exists in project `%s`", wid, pid)
			return
		}

		proxy := &httputil.ReverseProxy{
			Rewrite: func(pr *httputil.ProxyRequest) {
				pr.Out.URL = &url.URL{
					Scheme:   "http",
					Host:     fmt.Sprintf("%s:%s", js[pid].Workspaces[wid].IPAddress, port),
					Path:     "/" + rest,
					RawQuery: r.URL.RawQuery,
				}
				pr.SetXForwarded()
				pr.Out.Header.Add("X-Forwarded-Prefix", fmt.Sprintf("/port/%s/%s/%s/%s", pid, wid, port, rest))
			},
		}

		proxy.ServeHTTP(w, r)
	})
}
