import assert from 'node:assert/strict'
import test from 'node:test'
import { getSyoboiFileName } from './syoboi-utils'

const day = 1000 * 60 * 60 * 24
const now = 30 * day
const recordedEndAt = now - day

void test('waits for missing Syoboi metadata before three days have elapsed', () => {
  assert.equal(getSyoboiFileName('Show', null, null, recordedEndAt, now), null)
})

void test('uses null metadata in the filename at the three-day boundary', () => {
  assert.equal(
    getSyoboiFileName('Show', null, null, now - 3 * day, now),
    'Show 第null話 null'
  )
})

void test('uses null metadata in the filename after the three-day wait', () => {
  assert.equal(
    getSyoboiFileName('Show', null, null, now - 4 * day, now),
    'Show 第null話 null'
  )
})

void test('uses null metadata in the filename after thirty days', () => {
  assert.equal(
    getSyoboiFileName('Show', null, null, now - 30 * day, now),
    'Show 第null話 null'
  )
})

void test('uses available metadata without waiting', () => {
  assert.equal(
    getSyoboiFileName('Show', '1', 'Episode', recordedEndAt, now),
    'Show 第1話 Episode'
  )
})
