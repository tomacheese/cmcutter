import fs from 'node:fs'
import { Logger } from '@book000/node-utils'
import type { DiscordMessageEmbed } from './utlis'

/**
 * Discord に送信するメッセージ
 */
export interface OutboxMessage {
  content: string
  embed: DiscordMessageEmbed
}

/**
 * 未送信通知 1 件分。`id` は encodedDataFile のキー (`dirname/name`) と同じ形式
 */
export interface OutboxEntry {
  id: string
  message: OutboxMessage
  createdAt: string
}

/**
 * `flushNotifications` の結果
 */
export interface FlushResult {
  sent: number
  failed: number
}

/**
 * 値が null でないオブジェクトか判定する
 *
 * @param value 判定する値
 * @returns オブジェクトなら true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 値が OutboxEntry の形状を満たすか判定する
 *
 * @param value 判定する値
 * @returns OutboxEntry なら true
 */
function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || typeof value.createdAt !== 'string') {
    return false
  }
  const message = value.message
  return (
    isRecord(message) &&
    typeof message.content === 'string' &&
    isRecord(message.embed)
  )
}

/**
 * outbox ファイルを読み込む。存在しなければ空配列を返す
 *
 * @param outboxPath outbox ファイルのパス
 * @returns 未送信通知の一覧
 */
function readOutbox(outboxPath: string): OutboxEntry[] {
  if (!fs.existsSync(outboxPath)) {
    return []
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(outboxPath, 'utf8'))
  } catch (error) {
    throw new Error(
      `Outbox file is not valid JSON: ${outboxPath} (${
        error instanceof Error ? error.message : String(error)
      })`
    )
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError(`Outbox file is not an array: ${outboxPath}`)
  }
  const entries: unknown[] = parsed
  for (const [index, entry] of entries.entries()) {
    if (!isOutboxEntry(entry)) {
      throw new TypeError(
        `Outbox file has an invalid entry at index ${index}: ${outboxPath}`
      )
    }
  }
  return entries as OutboxEntry[]
}

/**
 * outbox ファイルを一時ファイル経由で置き換えて書き込む
 *
 * @param outboxPath outbox ファイルのパス
 * @param entries 書き込む未送信通知の一覧
 */
function writeOutbox(outboxPath: string, entries: OutboxEntry[]): void {
  const tempPath = `${outboxPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(entries, null, 2))
  fs.renameSync(tempPath, outboxPath)
}

/**
 * 未送信通知を outbox に追加する。同じ `id` が既にあれば置き換える
 *
 * @param outboxPath outbox ファイルのパス
 * @param entry 追加する未送信通知
 */
export function enqueueNotification(
  outboxPath: string,
  entry: OutboxEntry
): void {
  const entries = readOutbox(outboxPath).filter((e) => e.id !== entry.id)
  entries.push(entry)
  writeOutbox(outboxPath, entries)
}

/**
 * outbox の未送信通知を先頭から順に送信する。送信に成功したものは 1 件ごとに
 * outbox から削除し、失敗したものは残して次の通知へ進む
 *
 * @param outboxPath outbox ファイルのパス
 * @param send 1 件の通知を送信する関数
 * @returns 送信に成功した件数と失敗した件数
 */
export async function flushNotifications(
  outboxPath: string,
  send: (message: OutboxMessage) => Promise<void>
): Promise<FlushResult> {
  const logger = Logger.configure('Outbox.flushNotifications')
  const result: FlushResult = { sent: 0, failed: 0 }
  for (const entry of readOutbox(outboxPath)) {
    try {
      await send(entry.message)
    } catch (error) {
      result.failed++
      logger.error(
        `❌ Failed to send notification ${entry.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      continue
    }
    result.sent++
    writeOutbox(
      outboxPath,
      readOutbox(outboxPath).filter((e) => e.id !== entry.id)
    )
  }
  return result
}
