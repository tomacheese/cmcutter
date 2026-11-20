import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { enqueueNotification, flushNotifications } from './outbox'

const entry = {
  id: 'anime/example.ts',
  message: { content: 'example', embed: {} },
  createdAt: '2026-01-01T00:00:00.000Z',
}

void test('retains failed notifications for the next run', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const outbox = path.join(directory, 'outbox.json')
  try {
    enqueueNotification(outbox, entry)
    assert.deepEqual(
      await flushNotifications(outbox, () =>
        Promise.reject(new Error('simulated failure'))
      ),
      { sent: 0, failed: 1 }
    )
    assert.deepEqual(JSON.parse(fs.readFileSync(outbox, 'utf8')), [entry])
    const sent: unknown[] = []
    assert.deepEqual(
      await flushNotifications(outbox, (message) => {
        sent.push(message)
        return Promise.resolve()
      }),
      { sent: 1, failed: 0 }
    )
    assert.deepEqual(sent, [entry.message])
    assert.deepEqual(JSON.parse(fs.readFileSync(outbox, 'utf8')), [])
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

void test('does not overwrite a corrupt outbox on enqueue or flush', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const outbox = path.join(directory, 'outbox.json')
  const corrupt = '{invalid json'
  try {
    fs.writeFileSync(outbox, corrupt)
    assert.throws(() => {
      enqueueNotification(outbox, entry)
    }, /not valid JSON/)
    await assert.rejects(
      flushNotifications(outbox, () => Promise.resolve()),
      /not valid JSON/
    )
    assert.equal(fs.readFileSync(outbox, 'utf8'), corrupt)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
