import axios from 'axios'
import config from 'config'
import fs from 'fs'
import JSON from 'json5'
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
        path: path,
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

export async function processFileName(
  recordeds: EPGRecorded[],
  channels: EPGChannel[],
  file: File
): Promise<string> {
  if (file.dirname.startsWith('anime')) {
    console.log(`${file.name} is anime`)

    const recorded = recordeds.find((record) =>
      record.videoFiles.find((file) => file.filename === file.name)
    )
    if (!recorded) {
      console.log(`${file.name} is get recorded failed`)
      return file.name
    }
    const channel = channels.find(
      (channel) => channel.id === recorded.channelId
    )
    if (!channel) {
      console.log(`${file.name} is get channel failed`)
      return file.name
    }
    const syoboi = new Syoboi()
    const result = await syoboi.requestRSS({
      start: formatDate(new Date(recorded.startAt), 'yyyyMMddHHmm'),
      end: formatDate(new Date(recorded.endAt), 'yyyyMMddHHmm'),
      alt: 'json',
    })
    const syoboiItem = result.find((r) => recorded.name.includes(r.Title))
    if (!syoboiItem) {
      console.log(`${file.name} is get syoboi item failed`)
      return file.name
    }
    return `${syoboiItem.Title}/${syoboiItem.Title} 第${syoboiItem.Count}話 ${syoboiItem.SubTitle}`
  }
  return file.name
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
    `http://discord.com/api/channels/${discordChannelId}/messages`,
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
