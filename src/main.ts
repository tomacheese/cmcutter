import { execSync, spawn } from 'node:child_process'
import config from 'config'
import fs from 'node:fs'
import path from 'node:path'
import { EPGStation } from './lib/epgstation'
import { Logger } from '@book000/node-utils'
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

const tsFilesDirectoryPath = config.get<string>('tsFilesDirPath')
const outputDirectoryPath = config.get<string>('outputDirPath')

async function main(): Promise<void> {
  const logger = Logger.configure('main')
  if (!(await checkLatest())) {
    logger.info('🆕 New version was found. Please update and restart it.')
    execSync('git pull')
    // eslint-disable-next-line unicorn/no-process-exit
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

  const files = getTSFiles(tsFilesDirectoryPath, '')

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
    if (filename === null) {
      logger.warn(`❌ ${file.name}: dirname or filename is null. Skip`)
      continue
    }

    const outputDirectory = file.dirname.startsWith('anime')
      ? path.join(outputDirectoryPath, 'anime', dirname)
      : path.join(outputDirectoryPath, file.dirname)
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true })
    }

    const jlseCommand = getJLSECommand(file.path, outputDirectory, filename)
    logger.info(`🚀 JLSE Command: /usr/bin/jlse ${jlseCommand.join(' ')}`)

    const jlseStartTime = performance.now()
    const jlseProcess = spawn('/usr/bin/jlse', jlseCommand)
    logger.info(`🔢 Process ID: ${process.pid}`)
    logger.info(`🔢 Child Process ID: ${jlseProcess.pid}`)

    jlseProcess.stdout.on('data', (chunk: { toString: () => string }) => {
      const stringChunk = chunk.toString().trim()
      if (stringChunk.trim().length === 0) return
      if (
        stringChunk.trim().endsWith('%') ||
        stringChunk.trim().endsWith('\r')
      ) {
        process.stdout.write('\r' + stringChunk.trim())
      } else {
        logger.info(stringChunk.trim())
      }
    })
    jlseProcess.stderr.on('data', (chunk: { toString: () => string }) => {
      const stringChunk = chunk.toString().trim()
      if (stringChunk.trim().length === 0) return
      if (
        stringChunk.trim().endsWith('%') ||
        stringChunk.trim().endsWith('\r')
      ) {
        process.stdout.write('\r' + stringChunk.trim())
      } else {
        logger.error(stringChunk.trim())
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

    const outputFilePath = path.join(outputDirectory, filename) + '.mp4'
    const outputFileSize = fs.statSync(outputFilePath).size

    await sendDiscordMessage('', {
      title: `CMカット完了`,
      description: `\`${file.name}\` を CMカットしました`,
      fields: [
        {
          name: '出力先',
          value: outputFilePath,
        },
        {
          name: 'ファイルサイズ',
          value: formatBytes(outputFileSize),
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
