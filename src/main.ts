import { execSync, spawn } from 'child_process'
import config from 'config'
import fs from 'fs'
import path from 'path'
import { EPGStation } from './lib/epgstation'
import {
  addEncoded,
  checkLatest,
  formatBytes,
  getJLSECommand,
  getTSFiles,
  isEncoded,
  msToTime,
  processFileName,
  sendDiscordMessage,
} from './lib/utlis'

const tsFilesDirPath = config.get('tsFilesDirPath') as string
const outputDirPath = config.get('outputDirPath') as string

;(async (): Promise<void> => {
  if (!(await checkLatest())) {
    console.log('After a new version was found, update up and restart it.')
    execSync('git pull')
    process.exit(1)
  }

  const epg = new EPGStation()
  console.log('Fetch EPGStation Recorded')
  const recordeds = await epg.getRecordeds()
  console.log('Fetch EPGStation Channels')
  const channels = await epg.getChannels()

  const files = getTSFiles(tsFilesDirPath, '')

  for (const file of files) {
    if (isEncoded(file)) {
      console.log(`${file.name} is encoded`)
      continue
    }

    const [dirname, filename] = await processFileName(recordeds, channels, file)
    console.log(`Dirname: ${dirname}`)
    console.log(`Filename: ${filename}`)

    const outputDir = file.dirname.startsWith('anime')
      ? path.join(outputDirPath, 'anime', dirname)
      : path.join(outputDirPath, file.dirname)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const jlseCmd = getJLSECommand(file.path, outputDir, filename)
    console.log('JLSE Command: /usr/bin/jlse ', jlseCmd.join(' '))

    const jlseStartTime = performance.now()
    const jlseProcess = spawn('/usr/bin/jlse', jlseCmd)
    console.log('process id:' + process.pid)
    console.log('child process id:' + jlseProcess.pid)

    jlseProcess.stdout.on('data', (chunk) => {
      if (chunk.toString().trim().length === 0) return
      if (
        chunk.toString().trim().endsWith('%') ||
        chunk.toString().trim().endsWith('\r')
      ) {
        process.stdout.write('\r' + chunk.toString().trim())
      } else {
        console.log(chunk.toString().trim())
      }
    })
    jlseProcess.stderr.on('data', (chunk) => {
      if (chunk.toString().trim().length === 0) return
      if (
        chunk.toString().trim().endsWith('%') ||
        chunk.toString().trim().endsWith('\r')
      ) {
        process.stdout.write('\r' + chunk.toString().trim())
      } else {
        console.log(chunk.toString().trim())
      }
    })

    await new Promise<void>((resolve) => {
      jlseProcess.on('exit', () => {
        resolve()
      })
    })
    const jlseEndTime = performance.now()
    console.log('exitCode: ', jlseProcess.exitCode)
    if (jlseProcess.exitCode !== 0) {
      console.log('encoding failed')
      continue
    }
    addEncoded(file)

    await sendDiscordMessage('', {
      title: `CMカット完了`,
      description: `\`${file.name}\` を CMカットしました`,
      fields: [
        {
          name: '出力先',
          value: path.join(outputDir, filename) + '.mp4',
        },
        {
          name: 'ファイルサイズ',
          value: `${formatBytes(
            fs.statSync(path.join(outputDir, filename) + '.mp4').size
          )}`,
        },
        {
          name: 'エンコード処理時間',
          value: msToTime(jlseEndTime - jlseStartTime),
        },
      ],
    })
  }
})()
