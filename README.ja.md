# mcp-pyodide

Model Context Protocol (MCP)のPyodide実装サーバーです。このサーバーを使用することで、大規模言語モデル（LLM）がMCPインターフェースを通じてPythonコードを実行することができます。

## 機能

- Pyodideを使用したLLMからのPythonコード実行機能
- MCPに準拠したサーバー実装
- TypeScriptで書かれた堅牢な実装
- コマンドラインツールとしても利用可能

## インストール

```bash
npm install mcp-pyodide
```

## 使用方法

### サーバーとして使用

```typescript
import { runServer } from 'mcp-pyodide';

// サーバーを起動
runServer().catch((error: unknown) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
```

### コマンドラインツールとして使用

```bash
mcp-pyodide
```

## プロジェクト構造

```
mcp-pyodide/
├── src/
│   ├── formatters/    # データフォーマット処理
│   ├── handlers/      # リクエストハンドラー
│   ├── lib/          # ライブラリコード
│   ├── tools/        # ユーティリティツール
│   ├── utils/        # ユーティリティ関数
│   └── index.ts      # メインエントリーポイント
├── build/            # ビルド成果物
├── pyodide-packages/ # Pyodide関連パッケージ
└── package.json
```

## 依存パッケージ

- `@modelcontextprotocol/sdk`: MCPのSDK（^1.4.0）
- `pyodide`: Python実行環境（^0.27.1）
- `arktype`: 型検証ライブラリ（^2.0.1）

## 開発

### 必要条件

- Node.js 18以上
- npm 9以上

### セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>

# 依存パッケージのインストール
npm install

# ビルド
npm run build
```

### スクリプト

- `npm run build`: TypeScriptのコンパイルと実行権限の設定

## ライセンス

ISC

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -am 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 注意事項

- このプロジェクトは開発中であり、APIは変更される可能性があります
- 本番環境での使用は十分なテストを行ってください
- セキュリティの観点から、信頼できないコードの実行には注意が必要です

## サポート

問題や質問がある場合は、Issueトラッカーを使用してください。