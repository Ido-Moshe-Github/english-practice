import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Run one `claude -p` call and return the model's reply text.
 *
 * Two non-obvious things matter here:
 * - stdin MUST be closed. Given an open pipe, `claude -p` waits for input that
 *   never arrives and the call hangs indefinitely.
 * - `--disable-slash-commands` stops a skill installed on the machine from
 *   intercepting the prompt and answering with prose instead of the JSON we want.
 */
export function runClaude(prompt, { model, timeoutMs = 300_000 }) {
  const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--disable-slash-commands']

  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`claude timed out after ${Math.round(timeoutMs / 1000)}s`))
    }, timeoutMs)

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(
        err.code === 'ENOENT'
          ? new Error('the `claude` CLI was not found on PATH — check `claude --version`')
          : err
      )
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        return reject(new Error(`claude exited with code ${code}: ${stderr.trim().slice(0, 200)}`))
      }
      let envelope
      try {
        envelope = JSON.parse(stdout)
      } catch {
        return reject(new Error(`could not parse the CLI envelope: ${stdout.slice(0, 200)}`))
      }
      if (envelope.is_error) return reject(new Error(envelope.result || 'claude reported an error'))
      resolvePromise(envelope.result)
    })
  })
}

/** Run `fn`, retrying once — an occasional reply comes back as prose, not JSON. */
export async function withRetry(fn, onRetry) {
  try {
    return await fn()
  } catch (err) {
    onRetry?.(err)
    return fn()
  }
}
