# Claude Code Instructions (CLAUDE.md)

## プロジェクト概要

EPGStation で録画された TS ファイルを、Join Logo Scp Encoder (jlse) を使用して CM カットおよび MP4 変換を行う Node.js プログラムです。

## 技術スタック

- 言語: TypeScript
- ランタイム: Node.js (tsx)
- パッケージマネージャー: pnpm
- 主要ライブラリ: `axios`, `config`, `@book000/node-utils`
- 外部ツール: `jlse` (/usr/bin/jlse)

## 開発コマンド

- `pnpm install`: 依存関係のインストール
- `pnpm dev`: 開発モードでの実行 (tsx watch)
- `pnpm start`: 実行
- `pnpm compile`: TypeScript のコンパイル
- `pnpm lint`: 静的解析 (ESLint, Prettier, tsc)
- `pnpm fix`: 自動修正 (ESLint, Prettier)

## コーディングルール

- **言語**: 会話およびドキュメント、コード内コメントは日本語を使用。
- **エラーメッセージ**: 英語で記載。
- **命名規則**:
  - 変数・関数: キャメルケース (`camelCase`)
  - クラス: パスカルケース (`PascalCase`)
  - 定数: スネークケース（大文字） (`UPPER_SNAKE_CASE`)
- **TypeScript**:
  - 型安全性を重視し、`any` の使用を避ける。
  - `skipLibCheck: true` による型チェック回避は禁止。
- **ドキュメント**: 関数やインターフェースには JSDoc 形式のコメントを日本語で付与。
- **フォーマット**: Prettier の設定に従う（セミコロンなし、シングルクォート推奨）。

## コミット・PR 規約

- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う。
  - 形式: `<type>(<scope>): <description>`
  - `<description>` は日本語。
- **ブランチ名**: [Conventional Branch](https://conventional-branch.github.io) に従う。
  - `feat/`, `fix/`, `docs/`, `chore/` 等の短縮形を使用。

## ディレクトリ構造

- `src/`: ソースコード
  - `main.ts`: エントリーポイント
  - `lib/`: ライブラリ・共通処理
- `SystemdFiles/`: systemd 関連の構成ファイル
- `config/`: 設定ファイル（Git 管理対象外を含む）

## 特記事項

- 実行環境に `jlse` がインストールされている必要がある。
- 設定は `config/default.yml` で行い、`tsFilesDirPath`, `outputDirPath`, `discordToken` などの設定が必須。
