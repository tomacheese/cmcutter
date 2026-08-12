// ponytail: config@5.0.0's published .d.ts is broken under Node16 module
// resolution (types/lib/config.d.ts imports a type from its .mjs sibling
// without a `resolution-mode` attribute, which tsc rejects). tsconfig.json
// redirects the "config" specifier to this stub for type-checking only
// (runtime resolution via Node/tsx is unaffected), until upstream fixes
// node-config/node-config's published types.
declare const config: {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is cast-only, mirrors config's own (broken) upstream signature
  get<T>(setting: string): T
  has(setting: string): boolean
}
export = config
