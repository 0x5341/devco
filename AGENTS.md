# devco
ローカルでgithub codespace的な物を実装する

# 構成
```
/ <- go server implement
/ui <- frontend ui(react, vite)
```

# 技術構成
- frontend
  - pnpm
  - node
  - react
  - vite
  - react router
  - tailwindcss
  - shadcn/ui
- go server
  - embed.FS(uiを埋め込み)
  - net/http  
  

# 注意事項
- `go server implement`についてはいかなる動機があっても*触らない*こと
- frontendに関して、必ず`vitest browser mode`, `vitest`を通したテストを実装すること

