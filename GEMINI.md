# Gemini CLI Instructions (GEMINI.md)

## コンテキスト

あなたは Gemini CLI エージェントとして、このリポジトリ `cmcutter` の開発を支援します。

## プロジェクト特性

- **機能**: TV 録画の CM カットと MP4 変換の自動化。
- **スタック**: TypeScript, Node.js, pnpm。
- **外部依存**: `jlse` コマンド, EPGStation API, Discord Webhook。

## 振る舞いとルール

- **言語**: 日本語で応答し、コード内のコメントも日本語で記載してください。
- **フォーマット**:
  - 日本語と英数字の間には半角スペースを挿入します。
  - Prettier の設定（セミコロンなし、シングルクォート）を遵守してください。
- **コミットメッセージ**:
  - `feat: 機能追加` のように Conventional Commits に従い、説明は日本語で記載してください。
- **型定義**:
  - TypeScript の型定義を厳格に行い、`any` を避けてください。
  - `skipLibCheck` は絶対に使用しないでください。

## 開発・運用コマンド

- `pnpm install`: 依存関係のセットアップ。
- `pnpm start`: アプリケーションの実行。
- `pnpm dev`: 開発中の動作確認。
- `pnpm lint`: コードスタイルの確認。
- `pnpm fix`: コードスタイルの自動修正。
- `pnpm compile`: 型チェック。

## 注意事項

- 設定ファイル `config/default.yml` には機密情報が含まれる可能性があるため、取り扱いに注意してください。
- `jlse` コマンドのパスは `/usr/bin/jlse` に固定されているため、必要に応じて設定で変更可能にすることを検討してください。
