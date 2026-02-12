# Devco: Development Environment Controler
このツールはローカル環境管理ツールで、GoとReactで記述され、シングルバイナリで動作します。（実行時に必要な外部依存はdockerのみ）

## 技術詳細
- Go
  - REST APIバックエンドやDB操作、Web UIの配信などを担当
  - Web UIはembedFSで埋め込む
- Vite/React
  - Web Frontendを担当

## ファイル構成
```
/ <- Go package (main command)
/ui <- React Package (web ui)
/docs <- documentation
```

## 実装においての注意
- /docsの内容や、context7、playwright-cliなどを活用して情報収集すること。
- 必要においてAGENTS.mdを編集してよいが、基本的なことは/docsに記述すること。
- 必ず実装後に`go fmt`, `go test`, `golangci-lint run`, `cd ui && pnpm test`を実行すること。
- 必ずe2e, go apiテストを実装すること。
- 必ずvitest, vitest browser modeの実装を行うこと。
- 実装上、devcontainerの操作が必要になることがある。その場合はgithub.com/0x5341/godevを使用すること。
  これはcontext7に存在しないが、/docs/godevに存在するため、コードを直接読んで使用すること。
  - なお、/docs/godevに依存してはならず、必ずgo get github.com/0x5341/godevをおこなって使用すること。
