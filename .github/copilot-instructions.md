# GitHub Copilot Instructions

## プロジェクト概要

- **目的**: EPGStation で録画した TV 録画の TS ファイルを CM カットして、MP4 に変換し、必要に応じてファイル名を変更する。
- **主な機能**:
  - TS ファイルの CM カットと MP4 変換（Join Logo Scp Encoder (jlse) を使用）
  - EPGStation からの録画情報の取得
  - 処理済みファイルの一覧管理
  - Discord への処理完了通知
- **対象ユーザー**: 個人（開発者自身）

## 共通ルール

- 会話は日本語で行う。
- PR とコミットは [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従う。
  - `<type>(<scope>): <description>` 形式で、`<description>` は日本語。
- ブランチ命名は [Conventional Branch](https://conventional-branch.github.io) に従う。
  - `feat/`, `fix/` などの短縮形を使用。
- 日本語と英数字の間には半角スペースを入れる。

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js (tsx)
- **パッケージマネージャー**: pnpm
- **主要ライブラリ**:
  - `axios`: HTTP クライアント
  - `config`: 設定管理
  - `@book000/node-utils`: ユーティリティ
  - `jlse`: CM カット・エンコード（外部コマンド）

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発（ウォッチモード）
pnpm dev

# コンパイル
pnpm compile

# コンパイルチェック（エミットなし）
pnpm compile:test

# 静的解析とフォーマット修正
pnpm fix

# 静的解析
pnpm lint

# 実行
pnpm start
```

## コーディング規約

- **フォーマット**: Prettier を使用。
  - `semi: false`
  - `singleQuote: true`
  - `tabWidth: 2`
- **Lint**: ESLint を使用（`@book000/eslint-config`）。
- **TypeScript**: `skipLibCheck` を有効にして回避しないこと。
- **命名規則**: キャメルケースを基本とする。
- **JSDoc**: 関数やインターフェースには日本語で docstring を記載する。

## テスト方針

- 現時点ではテストコードは含まれていないが、追加する場合は既存のディレクトリ構造に合わせること。

## セキュリティ / 機密情報

- `config/default.yml` などの設定ファイルに認証情報（Discord トークンなど）を直接記載してコミットしない。
- ログに機密情報を出力しない。

## ドキュメント更新

- `README.md`
- `memo.md`

## リポジトリ固有

- `/usr/bin/jlse` コマンドがシステムにインストールされていることを前提としている。
- `config/` ディレクトリ配下に設定ファイルが必要。
