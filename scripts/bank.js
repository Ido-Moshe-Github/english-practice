import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ROOT } from './claudeCli.js'
import { itemId } from '../src/lib/items.js'

/** Reading and writing src/data/<lane>.json, shared by generate and review. */
export const bankPath = (laneId) => resolve(ROOT, 'src/data', `${laneId}.json`)

export async function loadBank(laneId) {
  if (!existsSync(bankPath(laneId))) return []
  const parsed = JSON.parse(await readFile(bankPath(laneId), 'utf8'))
  return Array.isArray(parsed) ? parsed : []
}

export async function saveBank(laneId, items) {
  await writeFile(bankPath(laneId), `${JSON.stringify(items, null, 2)}\n`, 'utf8')
}

export const idsOf = (items) => new Set(items.map(itemId))

/** Pull the JSON array out of a model reply, tolerating stray prose or code fences around it. */
export function parseJsonArray(reply) {
  const start = reply.indexOf('[')
  const end = reply.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error('no JSON array in the reply')
  const parsed = JSON.parse(reply.slice(start, end + 1))
  if (!Array.isArray(parsed)) throw new Error('reply is not an array')
  return parsed
}
