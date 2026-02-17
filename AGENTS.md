このプロジェクトは、AI Agentが自律的に動作できる分離された開発環境 `devco` を構築するためのツールです。開発に携わるエージェントは、以下の設計原則、制約、およびリファレンス設計を厳守してください。

## 1. 動作の絶対原則

* **[重要] 実装の制限**: 本ドキュメントの「3. 実装リファレンス（Step 3）」に記載された内容は、ユーザーから具体的なタスク（例：「Task 1.1を実装して」）の指示がない限り、**絶対に実装を開始してはいけません。**
* **インクリメンタル開発**: 常に「API実装/修正」と「UI実装/修正」を交互に行い、一歩ずつ動作確認可能な状態で進めてください。

## 2. 技術スタック & 基本方針

* **依存性の最小化**: 外部依存は **Docker** のみ。Go標準ライブラリ（`net/http` 等）を優先し、サードパーティ製Webフレームワークの使用を禁止します。
* **シングルバイナリ**: Web UI（React/Vite）はビルド後、Goの `embed` パッケージを用いてバイナリに同梱します。
* **データ管理**: ユーザーデータ（Worktree, DB）は `$XDG_DATA_HOME/devco` に集約します。
* **主要ライブラリ**:
* Git操作: `github.com/go-git/go-git/v5`
* DevContainer: `github.com/0x5341/godev`
* シリアライズ: `Colfer`

## 3. 実装リファレンス (Step 3 設計概要)

※以下の設計は、実装時の参照用であり、未指示の段階での実装を禁じます。

### 3.1 ネットワーク & プロキシ

* **ポート管理**:
* セッション起動時、ホスト側の空きポートをランダムに割り当て、`godev` を通じてコンテナポートとマップする。
* Goの `net/http` サーバーがリバースプロキシとなり、`/project/.../port/<num>` へのリクエストを `localhost:<assigned_port>` へ転送する。

* **ACP通信**:
* 通信フロー: `Web UI` ↔ (WebSocket) ↔ `Go Server` ↔ (TCP) ↔ `Container Proxy` ↔ (Stdin/Stdout) ↔ `Agent`

### 3.2 UI ルーティング

以下の階層構造を厳守してください。

* `/` : Dashboard (プロジェクト・セッション一覧)
* `/project` : プロジェクト一覧・管理
* `/project/<p_name>` : プロジェクト詳細
* `/project/<p_name>/session` : セッション一覧・追加
* `/project/<p_name>/session/<s_id>` : セッション詳細
* `/project/<p_name>/session/<s_id>/agent` : ACP Agent対話画面
* `/project/<p_name>/session/<s_id>/port/<number>` : 各ポートへのリバースプロキシ

### 3.3 データ構造

* メモリ上では `map[string]Session` 形式で管理し、`Colfer` を用いて `$XDG_DATA_HOME/devco/<project_name>/session.db` に保存する。

## 4. エージェントへの具体的指示

* 実装時は、常に現在のパスとコンテキストを確認すること。
* セキュリティのため、APIサーバーはデフォルトで `localhost` のみリスニングすること。
* コード生成時は、必要最小限で疎結合な関数・構造体を心がけること。
* TDDを心がけ、必ずテストを実行して下さい。
* docs/godevにgithub.com/0x5341/godevがあります。参考にしてください（ただしライブラリとして利用する際はgo get github.com/0x5341/godevを実行すること）
