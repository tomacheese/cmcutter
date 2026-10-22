# cmcutter

EPGStation で録画した TV 録画の TS ファイルを CM カットして、MP4 に変換し、必要に応じてファイル名を変更するプログラムです。個人利用目的にのみ使用しています。

## Installation

1. `git clone https://github.com/book000/cmcutter.git`
2. `cd cmcutter`
3. Download dependencies packages: `yarn`
4. Create a new file: `config/default.yml`, and edit the configuration
5. Compile & Run: `yarn build`

## Configuration

File: `config/default.yml`

- `tsFilesDirPath`: EPGStation が録画した TS ファイルがあるディレクトリ
- `outputDirPath`: 出力先ディレクトリ
- `encodedDataFile`: 処理済みファイルの一覧を保持するための JSON ファイルへのパス
- `discordChannelId`: 処理が完了したことを通知する先の Discord チャンネル ID
- `discordToken`: Discord への通知に使うトークン
- `notificationOutboxFile`: (任意) 送信に失敗した Discord 通知を保持するための JSON ファイルへのパス。次回実行時に再送されます。未指定の場合は `<encodedDataFile>.outbox.json` を使います。ファイルが破損した場合は、手動で修復または削除してください

```yaml
tsFilesDirPath: /path/to/recorded-dir/
outputDirPath: /path/to/output-dir/
encodedDataFile: /path/to/encoded.json
discordChannelId: '000000000000000000'
discordToken: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Other

- [Memo](memo.md)
