import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

// `pnpm test` runs from the repository root.
const repoRoot = process.cwd()
const configModule = path.join(repoRoot, 'src', 'lib', 'config.ts')

function listSourceFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(directory, file))
}

void test('loads config at runtime through tsx with the repository tsconfig', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cmcutter-config-'))
  try {
    fs.writeFileSync(
      path.join(directory, 'default.json'),
      JSON.stringify({ a: { b: 'value' } })
    )
    const probe = path.join(directory, 'probe.ts')
    fs.writeFileSync(
      probe,
      [
        `import config from ${JSON.stringify(configModule)}`,
        'console.log(JSON.stringify({',
        "  get: config.get('a.b'),",
        "  has: config.has('a.b'),",
        "  hasMissing: config.has('a.missing'),",
        '}))',
      ].join('\n')
    )
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_CONFIG_DIR: directory,
    }
    delete env.NODE_ENV
    delete env.NODE_CONFIG
    delete env.NODE_TEST_CONTEXT
    const result = spawnSync(
      path.join(repoRoot, 'node_modules', '.bin', 'tsx'),
      [probe],
      { cwd: repoRoot, env, encoding: 'utf8', timeout: 60_000 }
    )
    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      result.stdout.trim(),
      '{"get":"value","has":true,"hasMissing":false}'
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

void test('tsconfig paths contain only the @/* alias', () => {
  const tsconfig = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8')
  ) as { compilerOptions: { paths: Record<string, string[]> } }
  assert.deepEqual(Object.keys(tsconfig.compilerOptions.paths), ['@/*'])
})

void test('only src/lib/config.ts imports or requires config', () => {
  const offenders = listSourceFiles(path.join(repoRoot, 'src'))
    .filter((file) => file !== configModule && !file.endsWith('.test.ts'))
    .filter((file) =>
      /from\s+['"]config['"]|require\(\s*['"]config['"]\s*\)/.test(
        fs.readFileSync(file, 'utf8')
      )
    )
    .map((file) => path.relative(repoRoot, file))
  assert.deepEqual(offenders, [])
})
