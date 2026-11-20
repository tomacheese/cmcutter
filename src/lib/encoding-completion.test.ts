import assert from 'node:assert/strict'
import { ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { completeEncoding, waitForProcessClose } from './encoding-completion'
import { enqueueNotification } from './outbox'

for (const scenario of [
  'non-zero exit',
  'signal',
  'spawn failure',
  'success',
]) {
  void test(`records completion only after a successful encoder: ${scenario}`, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
    const outbox = path.join(directory, 'outbox.json')
    const encoded = path.join(directory, 'encoded.json')
    const child = new ChildProcess()
    const close = waitForProcessClose(child)
    try {
      if (scenario === 'spawn failure') {
        child.emit('error', new Error('spawn failed'))
      } else if (scenario === 'signal') {
        child.emit('close', null, 'SIGTERM')
      } else {
        child.emit('close', scenario === 'success' ? 0 : 1, null)
      }
      const run = async (): Promise<boolean> => {
        const result = await close
        return completeEncoding(result, () => {
          enqueueNotification(outbox, {
            id: 'anime/example.ts',
            message: { content: '', embed: {} },
            createdAt: '2026-01-01T00:00:00.000Z',
          })
          assert.equal(fs.existsSync(outbox), true)
          fs.writeFileSync(encoded, '["anime/example.ts"]')
          return Promise.resolve()
        })
      }
      if (scenario === 'spawn failure') {
        await assert.rejects(run(), /spawn failed/)
      } else {
        assert.equal(await run(), scenario === 'success')
      }
      assert.equal(fs.existsSync(encoded), scenario === 'success')
      assert.equal(fs.existsSync(outbox), scenario === 'success')
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
}
