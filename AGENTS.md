# AI Agents Instructions (AGENTS.md)

このドキュメントは、このリポジトリを扱う AI エージェント向けの基本方針をまとめたものです。

## プロジェクトの目的

EPGStation で録画された TV 番組の TS ファイルを CM カットし、MP4 に変換する自動化ツールです。

## 基本原則

- **日本語の使用**: ユーザーとの会話、コード内コメント、ドキュメントは日本語で行います。
- **正確な記述**: 日本語と英数字の間には半角スペースを挿入します。
- **規約の遵守**: Conventional Commits および Conventional Branch の規約を厳守します。

## 技術的要件

- **開発スタック**: TypeScript, Node.js, pnpm。
- **主要な依存関係**: `config` (設定管理), `jlse` (外部エンコーダー), `axios` (API 通信)。
- **品質管理**: `pnpm lint` および `pnpm fix` を使用してコード品質を維持します。

## 作業フロー

1. **現状分析**: `package.json` や既存の `src/` 配下のコードを確認し、プロジェクトの構造を理解します。
2. **実装**: TypeScript の型定義を適切に行い、JSDoc コメントを付与します。
3. **検証**: `pnpm compile` や `pnpm lint` を実行し、エラーがないことを確認します。
4. **コミット**: 適切な Conventional Commit メッセージを作成します。

## 重要なファイル

- `src/main.ts`: メインロジック。
- `src/lib/utlis.ts`: ユーティリティ関数（ファイル操作、エンコードコマンド生成など）。
- `src/lib/epgstation.ts`: EPGStation API との連携。
- `config/default.yml`: アプリケーションの設定（録画パス、通知設定など）。
