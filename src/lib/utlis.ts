import axios from 'axios'
import { execSync } from 'child_process'
import config from 'config'
import fs from 'fs'
import path from 'path'
import { EPGChannel, EPGRecorded } from './epgstation'
import { Syoboi } from './syoboi'

const encodedDataFile = config.get('encodedDataFile') as string

export function formatDate(date: Date, format: string): string {
  format = format.replace(/yyyy/g, String(date.getFullYear()))
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2))
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2))
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
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
  dirs.forEach((filename: any) => {
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
          `${subPath !== '' ? subPath + '/' : ''}${filename}`
        )
      )
    }
  })
  return files
}

export function isEncoded(file: File): boolean {
  if (!fs.existsSync(encodedDataFile)) {
    return false
  }
  const data = JSON.parse(fs.readFileSync(encodedDataFile, 'utf8'))
  return data.includes(file.dirname + '/' + file.name)
}

export function addEncoded(file: File): void {
  if (!fs.existsSync(encodedDataFile)) {
    fs.writeFileSync(encodedDataFile, '[]')
  }
  const data = JSON.parse(fs.readFileSync(encodedDataFile, 'utf8'))
  data.push(file.dirname + '/' + file.name)
  fs.writeFileSync(encodedDataFile, JSON.stringify(data, null, 2))
}

// https://github.com/l3tnun/EPGStation/blob/6dbcb58d6ab13b99b1489b5b0f60788f8b802599/src/util/StrUtil.ts#L64
export function toHalf(str: string): string {
  const tmp = str.replace(/[！-～]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  })

  return (
    tmp
      .replace(/”/g, '"')
      .replace(/’/g, "'")
      .replace(/‘/g, '`')
      .replace(/￥/g, '\\')
      // eslint-disable-next-line no-irregular-whitespace
      .replace(/　/g, ' ')
      .replace(/〜/g, '~')
  )
}

export async function processFileName(
  recordeds: EPGRecorded[],
  channels: EPGChannel[],
  file: File
): Promise<{
  dirname: string
  filename: string | null
} | null> {
  const notExtensionFileName = file.name.endsWith('.ts')
    ? file.name.slice(0, -3)
    : file.name

  const recorded = recordeds.find((record) =>
    record.videoFiles.find((f) => f.filename === file.name)
  )
  if (!recorded) {
    console.log(`${file.name} is get recorded failed`)
    return null
  }
  if (recorded.isEncoding || recorded.isRecording) {
    console.log(`${file.name} is encoding or recording`)
    return null
  }
  const channel = channels.find((channel) => channel.id === recorded.channelId)
  if (!channel) {
    console.log(`${file.name} is get channel failed`)
    return null
  }

  if (!file.dirname.startsWith('anime')) {
    return {
      dirname: '',
      filename: notExtensionFileName,
    }
  }
  console.log(`${file.name} is anime`)
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
      toHalf(r.Title).includes(toHalf(recorded.name))
  )
  if (!syoboiItem) {
    console.log(`${file.name} is get syoboi item failed`)
    return {
      dirname: originalDirname,
      filename: notExtensionFileName,
    }
  }
  // 3日以内の番組の場合、話数やサブタイトルがNULLだったらスキップするためにファイルタイトルにNULLを返す
  if (
    (syoboiItem.SubTitle === null || syoboiItem.Count === null) &&
    new Date(recorded.endAt).getTime() - new Date().getTime() <
      1000 * 60 * 60 * 24 * 3
  ) {
    console.log(
      `${file.name} is get syoboi item failed (SubTitle or Count is null)`
    )
    return {
      dirname: originalDirname,
      filename: null,
    }
  }
  return {
    dirname: `${syoboiItem.Title}`,
    filename: `${syoboiItem.Title} 第${syoboiItem.Count}話 ${syoboiItem.SubTitle}`,
  }
}

export function getJLSECommand(
  inputPath: string,
  outputDir: string,
  outputFileName: string
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
    '" -c:v h264_v4l2m2m -vf yadif=0:-1:1,scale=-1:720 -preset veryfast -acodec aac -b:v 4M -aspect 16:9 -r 24000/1001 -ab 256K"',
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
  embed: DiscordMessageEmbed
): Promise<void> {
  const discordChannelId = config.get('discordChannelId')
  const discordToken = config.get('discordToken')
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
    }
  )
  console.log('sendDiscordMessage: ', response.status)
}
export function msToTime(s: number): string {
  const pad = (n: string | number, z = 2): string => ('00' + n).slice(-z)
  return (
    pad((s / 3.6e6) | 0) +
    ':' +
    pad(((s % 3.6e6) / 6e4) | 0) +
    ':' +
    pad(((s % 6e4) / 1000) | 0) +
    '.' +
    pad(s % 1000, 3)
  )
}

export async function checkLatest(): Promise<boolean> {
  const repo = config.has('repo.repo')
    ? config.get('repo.repo')
    : 'tomacheese/cmcutter'
  const branch = config.has('repo.branch')
    ? config.get('repo.branch')
    : 'master'
  const response = await axios.get(
    `https://api.github.com/repos/${repo}/commits/${branch}`
  )
  const latest = response.data.sha
  const current = execSync('git rev-parse HEAD').toString().trim()
  if (latest !== current) {
    console.log(`checkLatest: ${current} is not latest: ${latest}`)
    return false
  }
  console.log(`checkLatest: ${current} is latest`)
  return true
}

export function formatBytes(bytes: number, decimals?: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals || 2
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
