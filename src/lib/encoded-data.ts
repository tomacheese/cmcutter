import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export function readEncodedData(encodedDataPath: string): string[] {
  if (!fs.existsSync(encodedDataPath)) {
    return []
  }

  const contents = fs.readFileSync(encodedDataPath, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(
      `Encoded data file is not valid JSON: ${encodedDataPath} (${error instanceof Error ? error.message : String(error)})`
    )
  }

  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new TypeError(
      `Encoded data file is not an array of strings: ${encodedDataPath}`
    )
  }

  return parsed as string[]
}

function resolveWritePath(encodedDataPath: string): string {
  let absolutePath = path.resolve(encodedDataPath)
  const visited = new Set<string>()

  while (true) {
    if (visited.has(absolutePath)) {
      throw new Error(
        `Encoded data file contains a symbolic link cycle: ${absolutePath}`
      )
    }
    visited.add(absolutePath)

    let stat: fs.Stats
    try {
      stat = fs.lstatSync(absolutePath)
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return absolutePath
      }
      throw error
    }

    if (!stat.isSymbolicLink()) {
      return absolutePath
    }

    absolutePath = path.resolve(
      fs.realpathSync(path.dirname(absolutePath)),
      fs.readlinkSync(absolutePath)
    )
  }
}

export function writeEncodedData(
  encodedDataPath: string,
  entries: string[],
  writeTemp = (tempPath: string, data: string): void => {
    fs.writeFileSync(tempPath, data, { flag: 'wx', mode: 0o600 })
  }
): void {
  const writePath = resolveWritePath(encodedDataPath)
  let mode: number | undefined
  try {
    mode = fs.statSync(writePath).mode & 0o7777
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )) {
      throw error
    }
  }

  const tempPath = `${writePath}.${randomUUID()}.tmp`
  writeTemp(tempPath, JSON.stringify(entries, null, 2))
  if (mode !== undefined) {
    fs.chmodSync(tempPath, mode)
  }
  fs.renameSync(tempPath, writePath)
}
