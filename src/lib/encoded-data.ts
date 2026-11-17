import fs from 'node:fs'

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

export function writeEncodedData(
  encodedDataPath: string,
  entries: string[],
  writeTemp = (tempPath: string, data: string): void => {
    fs.writeFileSync(tempPath, data)
  }
): void {
  const tempPath = `${encodedDataPath}.tmp`
  writeTemp(tempPath, JSON.stringify(entries, null, 2))
  fs.renameSync(tempPath, encodedDataPath)
}
