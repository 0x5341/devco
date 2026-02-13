# Master Design in devco
注: このデザインには必ず従うこと

# Go API構造
(net/httpを使用する)
```
/ <- dashboard(workspace, agent-task, 最近利用したproject一覧)
/project <- project一覧（projectの追加、削除）
/project/<project name>/ <- projectの状態一覧(pathなど), projectに所属するworkspace, agent-task一覧
/workspace/<workspace name> <- workspaceの状態(コンテナの状態、Appの起動ボタン)
/workspace/<workspace name>/port/<port number> <- コンテナ内のportをリバースプロキシしたもの
/workspace/<workspace name>/agent <- workspaceのagent-task一覧(動作中も過去実行した履歴も含まれる)
/workspace/<workspace name>/agent/<agent-task name> <- agent-taskの対話UI

/api <- REST APIのエンドポイント
```
# 概念一覧
## project
プロジェクト。Github repoとか。
git cloneして配置したもの。
基本的にはユーザーが指定する。
### states
- name
- path

## workspace
projectからbranchを新しく作って、worktreeで分岐したもの。
$XDG_STATE_HOME/devco/workspace/<workspace name>にworktreeは作る。
そのリポジトリのdevcontainer configに基づいてdevcontainerを立ち上げる。
devcontainerにworktreeはバインドマウントされ、編集は保存される。
devcontainer configがない場合はdebian:latestか何かを立ち上げる（検討中）
### states
- base branch
- isMerged
- name
- path (`$XDG_STATE_HOME/devco/workspace`からの相対パス)

## agent-task
Agent Client ProtocolでWorkspace devcontainer内で起動しているもの。
現状はPortを通してのACPの使用ができないので、devcontainer内部にACPをPort通信に変換するプロセスをインストールしたうえでACPを使用する。
agentと対話ができるUIがあり、それを通して指示を出す。
### states
- name
