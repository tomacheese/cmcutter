import fs from 'node:fs'
import { Logger } from '@book000/node-utils'
import type { DiscordMessageEmbed } from './utlis'

export interface OutboxMessage {
  content: string
  embed: DiscordMessageEmbed
}

/**
 * One pending notification. `id` uses the same format as the encodedDataFile key (`dirname/name`)
 */
export interface OutboxEntry {
  id: string
  message: OutboxMessage
  createdAt: string
}

export interface FlushResult {
  sent: number
  failed: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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
 * Reads the outbox file. Returns an empty array if it does not exist.
 * Throws if the file is malformed, so a corrupted outbox is never overwritten silently.
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

// Rename a temp file into place so a crash never leaves a partial outbox
function writeOutbox(outboxPath: string, entries: OutboxEntry[]): void {
  const tempPath = `${outboxPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(entries, null, 2))
  fs.renameSync(tempPath, outboxPath)
}

/**
 * Adds a pending notification to the outbox. Replaces any entry with the same `id`.
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
 * Sends pending notifications in order. Each successfully sent entry is removed
 * from the outbox immediately; failed entries are kept and the next one is tried.
 *
 * @returns Number of sent and failed notifications
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
