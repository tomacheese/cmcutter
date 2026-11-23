import assert from 'node:assert/strict'
import test from 'node:test'
import { EPGStation } from './epgstation'

function mockFetch(total: number, urls: string[]) {
  globalThis.fetch = ((input: string) => {
    urls.push(input)
    const offset = Number(new URL(input).searchParams.get('offset'))
    const count = Math.max(0, Math.min(300, total - offset))
    const records = Array.from({ length: count }, (_, i) => ({
      id: offset + i,
    }))
    return Promise.resolve(Response.json({ records, total }))
  }) as typeof fetch
}

void test('getRecordeds fetches every page using offset', async () => {
  const original = fetch
  const urls: string[] = []
  try {
    mockFetch(700, urls)
    const records = await new EPGStation().getRecordeds()
    assert.equal(records.length, 700)
    assert.deepEqual(
      records.map((r) => r.id),
      Array.from({ length: 700 }, (_, i) => i)
    )
    assert.deepEqual(urls, [
      'http://localhost:8888/api/recorded?isHalfWidth=false&limit=300&offset=0',
      'http://localhost:8888/api/recorded?isHalfWidth=false&limit=300&offset=300',
      'http://localhost:8888/api/recorded?isHalfWidth=false&limit=300&offset=600',
    ])
  } finally {
    globalThis.fetch = original
  }
})

void test('getRecordings stops after a single page when total fits', async () => {
  const original = fetch
  const urls: string[] = []
  try {
    mockFetch(2, urls)
    const records = await new EPGStation().getRecordings()
    assert.equal(records.length, 2)
    assert.deepEqual(urls, [
      'http://localhost:8888/api/recording?isHalfWidth=true&limit=300&offset=0',
    ])
  } finally {
    globalThis.fetch = original
  }
})

void test('getRecordeds stops on an empty page even if total is larger', async () => {
  const original = fetch
  try {
    globalThis.fetch = () =>
      Promise.resolve(Response.json({ records: [], total: 10 }))
    assert.deepEqual(await new EPGStation().getRecordeds(), [])
  } finally {
    globalThis.fetch = original
  }
})

void test('getRecordeds throws with the status on HTTP failure', async () => {
  const original = fetch
  try {
    globalThis.fetch = () => Promise.resolve(new Response('', { status: 500 }))
    await assert.rejects(
      new EPGStation().getRecordeds(),
      new Error('EPGStation getRecordeds failed: 500')
    )
  } finally {
    globalThis.fetch = original
  }
})
