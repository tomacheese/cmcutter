import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { readEncodedData, writeEncodedData } from './encoded-data'

void test('keeps the previous encoded data when writing the temp file fails', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const encodedDataPath = path.join(directory, 'encoded.json')
  const previousData = '[\n  "anime/previous.ts"\n]'
  fs.writeFileSync(encodedDataPath, previousData)

  try {
    assert.throws(() => {
      writeEncodedData(encodedDataPath, ['anime/next.ts'], (tempPath, data) => {
        fs.writeFileSync(tempPath, data.slice(0, 5))
        throw new Error('simulated write failure')
      })
    }, /simulated write failure/)

    assert.equal(fs.readFileSync(encodedDataPath, 'utf8'), previousData)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

void test('reports malformed encoded data without changing the original file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const encodedDataPath = path.join(directory, 'encoded.json')
  const corruptedData = '{invalid json'
  fs.writeFileSync(encodedDataPath, corruptedData)

  try {
    assert.throws(() => readEncodedData(encodedDataPath), /not valid JSON/)
    assert.equal(fs.readFileSync(encodedDataPath, 'utf8'), corruptedData)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

void test('preserves a symbolic link when replacing encoded data', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const targetPath = path.join(directory, 'encoded-target.json')
  const encodedDataPath = path.join(directory, 'encoded.json')
  fs.writeFileSync(targetPath, '[\n  \"anime/previous.ts\"\n]')
  fs.symlinkSync(targetPath, encodedDataPath)

  try {
    writeEncodedData(encodedDataPath, ['anime/next.ts'])

    assert.equal(fs.lstatSync(encodedDataPath).isSymbolicLink(), true)
    assert.deepEqual(readEncodedData(encodedDataPath), ['anime/next.ts'])
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
