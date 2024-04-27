import axios from 'axios'
import { execSync } from 'node:child_process'
import config from 'config'
import fs from 'node:fs'
import path from 'node:path'
import { EPGChannel, EPGRecorded } from './epgstation'
import { Logger } from '@book000/node-utils'
import { Syoboi } from './syoboi'

const encodedDataFile = config.get<string>('encodedDataFile')

export function formatDate(date: Date, format: string): string {
  format = format.replaceAll('yyyy', String(date.getFullYear()))
  format = format.replaceAll(
    'MM',
    ('0' + (date.getMonth() + 1).toString()).slice(-2),
  )
  format = format.replaceAll('dd', ('0' + date.getDate().toString()).slice(-2))
  format = format.replaceAll('HH', ('0' + date.getHours().toString()).slice(-2))
  format = format.replaceAll(
    'mm',
    ('0' + date.getMinutes().toString()).slice(-2),
  )
  format = format.replaceAll(
    'ss',
    ('0' + date.getSeconds().toString()).slice(-2),
  )
  format = format.replaceAll(
    'SSS',
    ('00' + date.getMilliseconds().toString()).slice(-3),
  )
  return format
}

interface File {
  name: string
  dirname: string
  path: string
}

export function getTSFiles(dirPath: string, subPath: string): File[] {
  const searchPath = path.join(dirPath, subPath)
  const files: File[] = []
  const dirs = fs.readdirSync(searchPath)
  for (const filename of dirs) {
    const path = `${searchPath}/${filename}`
    const stat = fs.statSync(path)
    if (stat.isFile() && path.endsWith('.ts')) {
      files.push({
        name: filename,
        dirname: subPath,
        path,
      })
    }
    if (stat.isDirectory()) {
      files.push(
        ...getTSFiles(
          dirPath,
          `${subPath === '' ? '' : subPath + '/'}${filename}`,
        ),
      )
    }
  }
  return files
}

export function isEncoded(file: File): boolean {
  if (!fs.existsSync(encodedDataFile)) {
    return false
  }
  const data: string[] = JSON.parse(fs.readFileSync(encodedDataFile, 'utf8'))
  return data.includes(file.dirname + '/' + file.name)
}

export function addEncoded(file: File): void {
  if (!fs.existsSync(encodedDataFile)) {
    fs.writeFileSync(encodedDataFile, '[]')
  }
  const data: string[] = JSON.parse(fs.readFileSync(encodedDataFile, 'utf8'))
  data.push(file.dirname + '/' + file.name)
  fs.writeFileSync(encodedDataFile, JSON.stringify(data, null, 2))
}

// https://github.com/l3tnun/EPGStation/blob/6dbcb58d6ab13b99b1489b5b0f60788f8b802599/src/util/StrUtil.ts#L64
export function toHalf(str: string): string {
  const tmp = str.replaceAll(/[！-～]/g, (s) => {
    const c = s.codePointAt(0)
    if (!c) {
      return ''
    }
    return String.fromCodePoint(c - 0xfe_e0)
  })

  return tmp
    .replaceAll('”', '"')
    .replaceAll('’', "'")
    .replaceAll('‘', '`')
    .replaceAll('￥', '\\')

    .replaceAll('\u3000', ' ')
    .replaceAll('〜', '~')
}

export async function processFileName(
  recordeds: EPGRecorded[],
  channels: EPGChannel[],
  file: File,
): Promise<{
  dirname: string
  filename: string | null
} | null> {
  const logger = Logger.configure('Utils.processFileName')
  const notExtensionFileName = file.name.endsWith('.ts')
    ? file.name.slice(0, -3)
    : file.name

  const recorded = recordeds.find((record) =>
    record.videoFiles.find((f) => f.filename === file.name),
  )
  if (!recorded) {
    logger.error(`❗ ${file.name} is get recorded failed`)
    return null
  }
  if (recorded.isEncoding || recorded.isRecording) {
    logger.info(`❗ ${file.name} is encoding or recording`)
    return null
  }
  const channel = channels.find((channel) => channel.id === recorded.channelId)
  if (!channel) {
    logger.error(`❗ ${file.name} is get channel failed`)
    return null
  }

  if (!file.dirname.startsWith('anime')) {
    return {
      dirname: '',
      filename: notExtensionFileName,
    }
  }
  logger.info(`🎥 ${file.name} is anime`)
  const originalDirname = file.dirname.replace('anime/', '')

  const syoboi = new Syoboi()
  const result = await syoboi.requestRSS({
    start: formatDate(new Date(recorded.startAt), 'yyyyMMddHHmm'),
    end: formatDate(new Date(recorded.endAt), 'yyyyMMddHHmm'),
    alt: 'json',
  })
  const syoboiItem = result.find(
    (r) =>
      toHalf(recorded.name).includes(toHalf(r.Title)) ||
      toHalf(r.Title).includes(toHalf(recorded.name)),
  )
  if (!syoboiItem) {
    logger.error(`❗ ${file.name} is get syoboi item failed`)
    return {
      dirname: originalDirname,
      filename: notExtensionFileName,
    }
  }
  // 3日以内の番組の場合、話数やサブタイトルがNULLだったらスキップするためにファイルタイトルにNULLを返す
  if (
    (syoboiItem.SubTitle === null || syoboiItem.Count === null) &&
    new Date(recorded.endAt).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3
  ) {
    logger.error(
      `❗ ${file.name} is get syoboi item failed (SubTitle or Count is null)`,
    )
    return {
      dirname: originalDirname,
      filename: null,
    }
  }
  return {
    dirname: syoboiItem.Title,
    filename: `${syoboiItem.Title} 第${syoboiItem.Count}話 ${syoboiItem.SubTitle}`,
  }
}

export function getJLSECommand(
  inputPath: string,
  outputDir: string,
  outputFileName: string,
): string[] {
  if (!inputPath.endsWith('.ts')) {
    throw new Error('inputPath is not ts')
  }
  return [
    `-i`,
    inputPath,
    '-e',
    '-t',
    'cutcm_logo',
    `-d`,
    outputDir,
    `-n`,
    outputFileName,
    '-o',
    '" -c:v h264_v4l2m2m -vf yadif=0:-1:1 -preset veryfast -acodec aac -b:v 4M -aspect 16:9 -r 24000/1001 -ab 256K"',
  ]
}

export interface MessageEmbedAuthor {
  name: string
  url?: string
  iconURL?: string
  proxyIconURL?: string
}
export interface MessageEmbedFooter {
  text: string
  iconURL?: string
  proxyIconURL?: string
}
export interface MessageEmbedImage {
  url: string
  proxyURL?: string
  height?: number
  width?: number
}

export interface MessageEmbedProvider {
  name: string
  url: string
}
export interface MessageEmbedThumbnail {
  url: string
  proxyURL?: string
  height?: number
  width?: number
}
export interface MessageEmbedVideo {
  url?: string
  proxyURL?: string
  height?: number
  width?: number
}

export interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

interface DiscordMessageEmbed {
  author?: MessageEmbedAuthor
  color?: number
  description?: string
  fields?: EmbedField[]
  footer?: MessageEmbedFooter
  image?: MessageEmbedImage
  provider?: MessageEmbedProvider
  thumbnail?: MessageEmbedThumbnail
  timestamp?: number
  title?: string
  url?: string
  video?: MessageEmbedVideo
}

export async function sendDiscordMessage(
  content: string,
  embed: DiscordMessageEmbed,
): Promise<void> {
  const logger = Logger.configure('Utils.sendDiscordMessage')
  const discordChannelId = config.get<string>('discordChannelId')
  const discordToken = config.get<string>('discordToken')
  const response = await axios.post(
    `https://discord.com/api/channels/${discordChannelId}/messages`,
    {
      content,
      embeds: [embed],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${discordToken}`,
      },
    },
  )
  logger.info(`📧 sendDiscordMessage: ${response.status}`)
}

export function pad(num: number, size = 2): string {
  return ('00' + num.toString()).slice(-size)
}

export function msToTime(s: number): string {
  return (
    pad(Math.trunc(s / 3.6e6)) +
    ':' +
    pad(Math.trunc((s % 3.6e6) / 6e4)) +
    ':' +
    pad(Math.trunc((s % 6e4) / 1000)) +
    '.' +
    pad(s % 1000, 3)
  )
}

export async function checkLatest(): Promise<boolean> {
  const logger = Logger.configure('Utils.checkLatest')
  const repo = config.has('repo.repo')
    ? config.get<string>('repo.repo')
    : 'tomacheese/cmcutter'
  const branch = config.has('repo.branch')
    ? config.get<string>('repo.branch')
    : 'master'
  const response = await axios.get<{
    sha: string
  }>(`https://api.github.com/repos/${repo}/commits/${branch}`)
  const latest = response.data.sha
  const current = execSync('git rev-parse HEAD').toString().trim()
  if (latest !== current) {
    logger.error(`❗ checkLatest: ${current} is not latest: ${latest}`)
    return false
  }
  logger.info(`✅ checkLatest: ${current} is latest`)
  return true
}

export function formatBytes(bytes: number, dm = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)).toString() +
    ' ' +
    sizes[i]
  )
}
