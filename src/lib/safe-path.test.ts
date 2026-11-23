import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { resolveInside, sanitizePathComponent } from './safe-path'

void test('replaces path separators so one component remains', () => {
  assert.equal(sanitizePathComponent('../../Show'), '_.._Show')
  assert.equal(sanitizePathComponent('A/B'), 'A_B')
  assert.equal(sanitizePathComponent(String.raw`A\B`), 'A_B')
})

void test('replaces NUL and other ASCII control characters', () => {
  assert.equal(sanitizePathComponent('A\u0000B'), 'A_B')
  assert.equal(sanitizePathComponent('A\u007FB'), 'A_B')
  assert.equal(sanitizePathComponent('A\nB'), 'A_B')
})

void test('never returns an empty, dot-only, or separator-bearing value', () => {
  for (const input of ['.', '..', '', '/', ' '.repeat(3), '. ..']) {
    const result = sanitizePathComponent(input)
    assert.notEqual(result, '')
    assert.ok(!result.startsWith('.'), input)
    assert.ok(!/[/\\]/.test(result), input)
  }
})

void test('leaves normal Japanese titles unchanged', () => {
  const title = 'ゆるキャン△ 第1話 はじめまして'
  assert.equal(sanitizePathComponent(title), title)
})

void test('resolves a path inside the root', () => {
  assert.equal(
    resolveInside('/tmp/output', 'anime', 'Show'),
    '/tmp/output/anime/Show'
  )
  assert.equal(
    resolveInside('/tmp/output/anime', '..foo'),
    '/tmp/output/anime/..foo'
  )
})

void test('throws when the path escapes or equals the root', () => {
  assert.throws(() => resolveInside('/tmp/output', 'anime', '../../Show'))
  assert.throws(() => resolveInside('/tmp/output', '/etc'))
  assert.throws(() => resolveInside('/tmp/output'))
  assert.throws(() => resolveInside('/tmp/output/anime', '..'))
  assert.throws(() => resolveInside('/tmp/output/anime', '../x'))
  assert.throws(() => resolveInside('/tmp/output/anime', ''))
})

void test('a sanitized hostile title stays under the anime directory', () => {
  const root = '/tmp/output'
  const resolved = resolveInside(
    path.join(root, 'anime'),
    sanitizePathComponent('../../Show')
  )
  assert.equal(resolved, '/tmp/output/anime/_.._Show')
})
