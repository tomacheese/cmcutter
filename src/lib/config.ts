interface AppConfig {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is cast-only, mirrors config's own upstream signature
  get<T>(setting: string): T
  has(setting: string): boolean
}

// The published types of `config` fail to type-check, so it must not go
// through TypeScript module resolution.
// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module -- see above
const config = require('config') as AppConfig

export default config
