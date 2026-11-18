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
  let failedTempPath = ''

  try {
    assert.throws(() => {
      writeEncodedData(encodedDataPath, ['anime/next.ts'], (tempPath, data) => {
        failedTempPath = tempPath
        fs.writeFileSync(tempPath, data.slice(0, 5))
        throw new Error('simulated write failure')
      })
    }, /simulated write failure/)

    assert.equal(fs.readFileSync(encodedDataPath, 'utf8'), previousData)
    assert.equal(fs.existsSync(failedTempPath), false)
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

void test('preserves the encoded data file mode when replacing it', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const encodedDataPath = path.join(directory, 'encoded.json')
  fs.writeFileSync(encodedDataPath, '[]', { mode: 0o600 })
  fs.chmodSync(encodedDataPath, 0o600)

  try {
    writeEncodedData(encodedDataPath, ['anime/next.ts'])

    assert.equal(fs.statSync(encodedDataPath).mode & 0o777, 0o600)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

void test('resolves relative links from a symlinked physical parent', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-'))
  const physicalParentPath = path.join(directory, 'real', 'nested')
  const logicalParentPath = path.join(directory, 'logical')
  const targetPath = path.join(directory, 'encoded-target.json')
  const encodedDataPath = path.join(logicalParentPath, 'encoded.json')
  fs.mkdirSync(physicalParentPath, { recursive: true })
  fs.symlinkSync(path.join(directory, 'real'), logicalParentPath)
  fs.writeFileSync(targetPath, '[]')
  fs.symlinkSync('../../encoded-target.json', encodedDataPath)

  try {
    writeEncodedData(encodedDataPath, ['anime/next.ts'])

    assert.deepEqual(readEncodedData(encodedDataPath), ['anime/next.ts'])
    assert.equal(fs.lstatSync(encodedDataPath).isSymbolicLink(), true)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
