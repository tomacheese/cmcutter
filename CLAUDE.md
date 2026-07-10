# CLAUDE.md

## プロジェクト概要

EPGStation で録画された TS ファイルを、Join Logo Scp Encoder (jlse) を使用して CM カットおよび MP4 変換する Node.js プログラム。処理完了後に Discord へ通知し、しょぼいカレンダーの情報を用いてファイル名を整形する。個人利用目的のツール。

## 技術スタック

- 言語: TypeScript / ランタイム: Node.js (tsx で直接実行、`.node-version` は 24.18.0)
- パッケージマネージャー: pnpm (`preinstall` で pnpm 以外を拒否)
- 主要ライブラリ: `config` (設定管理), `@book000/node-utils` (Logger)
- HTTP 通信: Node.js 標準の `fetch` を使用（EPGStation / しょぼいカレンダー / Discord）。axios 等の HTTP クライアントは未使用
- 外部ツール: `jlse` (`/usr/bin/jlse` に固定)

## 開発コマンド

- `pnpm install`: 依存関係のインストール
- `pnpm dev`: 開発モード実行 (`tsx watch`)
- `pnpm start`: 実行
- `pnpm compile`: TypeScript のコンパイル (`tsc -p .`)
- `pnpm compile:test`: 型チェックのみ (`--noEmit`)
- `pnpm lint`: 静的解析 (Prettier + ESLint + tsc)
- `pnpm fix`: 自動修正 (Prettier + ESLint)

## ディレクトリ構造

- `src/main.ts`: エントリーポイント
- `src/lib/epgstation.ts`: EPGStation API 連携
- `src/lib/syoboi.ts`: しょぼいカレンダー連携（番組情報取得）
- `src/lib/utlis.ts`: ユーティリティ（ファイル操作、エンコードコマンド生成など。ファイル名の綴りは既存のまま維持する）
- `SystemdFiles/`: systemd の service / timer と `install-systemd.sh`
- `config/`: 設定ファイル（Git 管理対象外。`config/default.yml` を手動作成）

## コーディングルール

- **言語**: 会話・ドキュメント・コード内コメントは日本語。エラーメッセージは英語。
- **半角スペース**: 日本語と英数字の間に半角スペースを入れる。
- **命名規則**: 変数・関数は `camelCase`、クラスは `PascalCase`、定数は `UPPER_SNAKE_CASE`。
- **TypeScript**: 型安全性を重視し `any` を避ける。`skipLibCheck: true` による型チェック回避は禁止。
- **JSDoc**: 関数・インターフェースには日本語で JSDoc を付与。
- **フォーマット**: Prettier 設定に従う（セミコロンなし・シングルクォート・`printWidth: 80`）。

## テスト方針

- 自動テストは無い。変更後は `pnpm lint`（`compile:test` を含む型チェックまで）を実行して確認する。

## コミット・PR 規約

- **コミットメッセージ**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) に従い、`<type>(<scope>): <description>` 形式。`<description>` は日本語。
- **ブランチ名**: [Conventional Branch](https://conventional-branch.github.io) の短縮形（`feat/`, `fix/`, `docs/`, `chore/` 等）。

## セキュリティ

- `config/default.yml` の `discordToken` などの認証情報をコミットしない。
- ログに機密情報を出力しない。

## ドキュメント更新

- 設定項目を追加・変更したら `README.md` の Configuration を更新する。
- 開発コマンドやディレクトリ構造を変えたら、この `CLAUDE.md` と `.github/copilot-instructions.md` を更新する。

## 特記事項

- 実行には `jlse` が `/usr/bin/jlse` にインストールされている必要がある。
- 設定は `config/default.yml` で行い、`tsFilesDirPath`, `outputDirPath`, `encodedDataFile`, `discordChannelId`, `discordToken` が必要。
