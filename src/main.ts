import { execSync, spawn } from 'child_process'
import config from 'config'
import fs from 'fs'
import path from 'path'
import { EPGStation } from './lib/epgstation'
import { Logger } from './lib/logger'
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

async function main(): Promise<void> {
  const logger = Logger.configure('main')
  if (!(await checkLatest())) {
    logger.info('🆕 New version was found. Please update and restart it.')
    execSync('git pull')
    process.exit(1)
  }

  const epg = new EPGStation()
  logger.info('📡 Fetch EPGStation Recorded')
  const rawRecordeds = await epg.getRecordeds()
  logger.info('📡 Fetch EPGStation Recording')
  const recordings = await epg.getRecordings()

  const recordeds = [...rawRecordeds, ...recordings]

  logger.info('📡 Fetch EPGStation Channels')
  const channels = await epg.getChannels()

  const files = getTSFiles(tsFilesDirPath, '')

  for (const file of files) {
    if (isEncoded(file)) {
      logger.info(`✅ ${file.name} is encoded`)
      continue
    }

    const result = await processFileName(recordeds, channels, file)
    if (result === null) {
      logger.warn(`❌ ${file.name} is get recorded failed`)
      continue
    }
    const { dirname, filename } = result
    logger.info(`📁 Dirname: ${dirname}`)
    logger.info(`📄 Filename: ${filename}`)
    if (dirname === null || filename === null) {
      logger.warn(`❌ ${file.name}: dirname or filename is null. Skip`)
      continue
    }

    const outputDir = file.dirname.startsWith('anime')
      ? path.join(outputDirPath, 'anime', dirname)
      : path.join(outputDirPath, file.dirname)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const jlseCmd = getJLSECommand(file.path, outputDir, filename)
    logger.info(`🚀 JLSE Command: /usr/bin/jlse ${jlseCmd.join(' ')}`)

    const jlseStartTime = performance.now()
    const jlseProcess = spawn('/usr/bin/jlse', jlseCmd)
    logger.info(`🔢 Process ID: ${process.pid}`)
    logger.info(`🔢 Child Process ID: ${jlseProcess.pid}`)

    jlseProcess.stdout.on('data', (chunk) => {
      if (chunk.toString().trim().length === 0) return
      if (
        chunk.toString().trim().endsWith('%') ||
        chunk.toString().trim().endsWith('\r')
      ) {
        process.stdout.write('\r' + chunk.toString().trim())
      } else {
        logger.info(chunk.toString().trim())
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
        logger.error(chunk.toString().trim())
      }
    })

    await new Promise<void>((resolve) => {
      jlseProcess.on('exit', () => {
        resolve()
      })
    })
    const jlseEndTime = performance.now()
    logger.info(`🔢 Exit Code: ${jlseProcess.exitCode}`)
    if (jlseProcess.exitCode !== 0) {
      logger.error(`❌ ${file.name} is encoding failed`)
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
}

;(async (): Promise<void> => {
  await main()
})()
