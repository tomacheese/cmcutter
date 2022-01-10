import { spawn } from 'child_process'
import config from 'config'
import fs from 'fs'
import path from 'path'
import { EPGStation } from './lib/epgstation'
import {
  addEncoded,
  getJLSECommand,
  getTSFiles,
  isEncoded,
  processFileName,
  sendDiscordMessage,
} from './lib/utlis'

const tsFilesDirPath = config.get('tsFilesDirPath') as string
const outputDirPath = config.get('outputDirPath') as string

;(async (): Promise<void> => {
  const epg = new EPGStation()
  console.log('Fetch EPGStation Recorded')
  const recordeds = await epg.getRecordeds()
  console.log('Fetch EPGStation Channels')
  const channels = await epg.getChannels()

  const files = getTSFiles(tsFilesDirPath, '')

  for (const file of files) {
    const outputDir = path.join(outputDirPath, file.dirname)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    if (isEncoded(file)) {
      console.log(`${file.name} is encoded`)
      continue
    }

    const filename = await processFileName(recordeds, channels, file)
    console.log(`Filename: ${filename}`)
    const jlseCmd = getJLSECommand(file.path, outputDir, filename)
    console.log('JLSE Command: /usr/bin/jlse ', jlseCmd.join(' '))

    const jlseProcess = spawn('/usr/bin/jlse', jlseCmd)
    console.log('process id:' + process.pid)
    console.log('child process id:' + jlseProcess.pid)

    jlseProcess.stdout.on('data', (chunk) => {
      if (chunk.toString().trim().length === 0) return
      if (chunk.toString().trim().endsWith('%')) {
        process.stdout.write('\r' + chunk.toString().trim())
      } else {
        console.log(chunk.toString().trim())
      }
    })
    jlseProcess.stderr.on('data', (chunk) => {
      if (chunk.toString().trim().length === 0) return
      if (chunk.toString().trim().endsWith('%')) {
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
    console.log('exitCode: ', jlseProcess.exitCode)
    if (jlseProcess.exitCode !== 0) {
      console.log('encoding failed')
      continue
    }
    addEncoded(file)

    await sendDiscordMessage('', {
      title: `CMカット完了`,
      description: `${file.name} を CMカットしました`,
      fields: [
        {
          name: '出力先',
          value: path.join(outputDir, filename),
        },
      ],
    })
  }
})()
