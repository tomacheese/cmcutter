import type { ChildProcess } from 'node:child_process'

/**
 * Result of a child process exit
 */
export interface ProcessCloseResult {
  /** Exit code. null if the process was terminated by a signal */
  code: number | null
  /** Terminating signal. null if the process was not terminated by a signal */
  signal: NodeJS.Signals | null
}

/**
 * Waits for a child process to exit (after its stdio has closed).
 * If the process fails to start (ENOENT / EACCES, etc.), rejects with the Error from the `error` event.
 * The `error` event fires on the next tick, so call this immediately after `spawn` without an `await` in between.
 */
export function waitForProcessClose(
  child: ChildProcess
): Promise<ProcessCloseResult> {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      resolve({ code, signal })
    })
  })
}

export async function completeEncoding(
  result: ProcessCloseResult,
  onSuccess: () => Promise<void>
): Promise<boolean> {
  if (result.code !== 0 || result.signal !== null) return false
  await onSuccess()
  return true
}
