import { execSync, spawn } from 'node:child_process'
import config from 'config'
import fs from 'node:fs'
import path from 'node:path'
import { EPGStation } from './lib/epgstation'
import { Logger } from '@book000/node-utils'
import { enqueueNotification, flushNotifications } from './lib/outbox'
import {
  addEncoded,
  checkLatest,
  formatBytes,
  getJLSECommand,
  getNotificationOutboxFile,
  getTSFiles,
  isEncoded,
  msToTime,
  type ProcessCloseResult,
  processFileName,
  sendDiscordMessage,
  waitForProcessClose,
} from './lib/utlis'

const tsFilesDirPath = config.get<string>('tsFilesDirPath')
const outputDirPath = config.get<string>('outputDirPath')
const outboxFile = getNotificationOutboxFile()

/**
 * outbox の未送信通知を Discord へ送信する。送信失敗では例外を投げない
 *
 * @param logger ログ出力に使う Logger
 */
async function flushOutbox(logger: Logger): Promise<void> {
  const { failed } = await flushNotifications(outboxFile, (message) =>
    sendDiscordMessage(message.content, message.embed)
  )
  if (failed > 0) {
    logger.warn(`⚠️ ${failed} notification(s) remain in the outbox`)
  }
}

async function main(): Promise<void> {
  const logger = Logger.configure('main')
  if (!(await checkLatest())) {
    logger.info('🆕 New version was found. Please update and restart it.')
    execSync('git pull')
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  }

  await flushOutbox(logger)

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
    if (filename === null) {
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
    const closePromise = waitForProcessClose(jlseProcess)
    logger.info(`🔢 Process ID: ${process.pid}`)
    logger.info(`🔢 Child Process ID: ${jlseProcess.pid}`)

    jlseProcess.stdout.on('data', (chunk: { toString: () => string }) => {
      const strChunk = chunk.toString().trim()
      if (strChunk.trim().length === 0) return
      if (strChunk.trim().endsWith('%') || strChunk.trim().endsWith('\r')) {
        process.stdout.write('\r' + strChunk.trim())
      } else {
        logger.info(strChunk.trim())
      }
    })
    jlseProcess.stderr.on('data', (chunk: { toString: () => string }) => {
      const strChunk = chunk.toString().trim()
      if (strChunk.trim().length === 0) return
      if (strChunk.trim().endsWith('%') || strChunk.trim().endsWith('\r')) {
        process.stdout.write('\r' + strChunk.trim())
      } else {
        logger.error(strChunk.trim())
      }
    })

    let closeResult: ProcessCloseResult
    try {
      closeResult = await closePromise
    } catch (error) {
      logger.error(
        `❌ ${file.name}: failed to start jlse: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      continue
    }
    const jlseEndTime = performance.now()
    logger.info(`🔢 Exit Code: ${closeResult.code}`)
    if (closeResult.signal !== null) {
      logger.info(`🔢 Signal: ${closeResult.signal}`)
    }
    if (closeResult.code !== 0 || closeResult.signal !== null) {
      logger.error(`❌ ${file.name} is encoding failed`)
      continue
    }

    const outputPath = path.join(outputDir, filename) + '.mp4'
    let fileSize = '不明'
    try {
      fileSize = formatBytes(fs.statSync(outputPath).size)
    } catch (error) {
      logger.warn(
        `❗ ${file.name}: failed to get output file size: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    // 通知を先に永続化する。処理済みにした後で通知が失われるのを避けるため
    enqueueNotification(outboxFile, {
      id: file.dirname + '/' + file.name,
      message: {
        content: '',
        embed: {
          title: `CMカット完了`,
          description: `\`${file.name}\` を CMカットしました`,
          fields: [
            { name: '出力先', value: outputPath },
            { name: 'ファイルサイズ', value: fileSize },
            {
              name: 'エンコード処理時間',
              value: msToTime(jlseEndTime - jlseStartTime),
            },
          ],
        },
      },
      createdAt: new Date().toISOString(),
    })
    addEncoded(file)

    await flushOutbox(logger)
  }
}

;(async (): Promise<void> => {
  await main()
})()
