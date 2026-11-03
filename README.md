# cmcutter

A program that cuts commercials (CM) from TS files recorded by EPGStation, converts them to MP4, and renames the output as needed. It is intended for personal use only.

## Requirements

- Node.js (version in `.node-version`) and pnpm
- [jlse](https://github.com/tobitti0/JoinLogoScpTrialSetLinux) installed at `/usr/bin/jlse`
- EPGStation reachable at `http://localhost:8888`

## Installation

1. `git clone https://github.com/tomacheese/cmcutter.git`
2. `cd cmcutter`
3. Install dependencies: `pnpm install`
4. Create `config/default.yml` and edit the configuration
5. Run: `pnpm start`

If the local checkout is not at the latest commit of the remote branch, the program runs `git pull` and exits with code 1. Restart it to run the updated code.

## Configuration

File: `config/default.yml`

- `tsFilesDirPath`: directory containing the TS files recorded by EPGStation
- `outputDirPath`: output directory
- `encodedDataFile`: path to a JSON file that stores the list of processed files
- `discordChannelId`: ID of the Discord channel to notify when processing completes
- `discordToken`: token used to send notifications to Discord
- `notificationOutboxFile`: (optional) path to a JSON file that stores Discord notifications that failed to send. They are resent on the next run. Defaults to `<encodedDataFile>.outbox.json`. If the file is corrupted, repair or delete it manually
- `repo.repo` / `repo.branch`: (optional) repository and branch compared against `HEAD` by the update check. Default to `tomacheese/cmcutter` and `master`

```yaml
tsFilesDirPath: /path/to/recorded-dir/
outputDirPath: /path/to/output-dir/
encodedDataFile: /path/to/encoded.json
discordChannelId: '000000000000000000'
discordToken: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Other

- [Memo](memo.md)
