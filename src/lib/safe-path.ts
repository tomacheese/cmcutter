import path from 'node:path'

/**
 * Turns untrusted text into a single, safe path component.
 * Path separators and control characters become `_`, leading dots and
 * whitespace are stripped, and an empty result becomes `_`.
 */
export function sanitizePathComponent(value: string): string {
  const sanitized = value
    .replaceAll(/[\p{Cc}/\\]/gu, '_')
    .replace(/^[\s.]+/, '')
    .replace(/\s+$/, '')
  return sanitized === '' ? '_' : sanitized
}

/**
 * Resolves `segments` against `root` and checks the result lexically.
 * Symlinks are not followed.
 * @throws If the result is `root` itself or lies outside `root`
 */
export function resolveInside(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, ...segments)
  const relative = path.relative(resolvedRoot, resolved)
  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith('..' + path.sep) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Path ${JSON.stringify(resolved)} is not inside ${JSON.stringify(resolvedRoot)}`
    )
  }
  return resolved
}
