#!/usr/bin/env node
/**
 * Review a question bank for language quality with a stronger model.
 *
 *   npm run review -- --lane tenses               # dry run: report only
 *   npm run review -- --lane tenses --apply       # rewrite / drop in place
 *   npm run review -- --lane tenses --from 240    # only items added since
 *
 * validate.js already guarantees the shape. What code can't check is whether
 * exactly one option is right, whether the English is natural and current, and
 * whether the words are everyday ones. Chunks are reviewed in parallel, and the
 * results applied in one go at the end, so nothing reads a half-written bank.
 *
 * A rewrite is kept only if it passes validate.js; anything flagged that can't
 * be repaired is dropped, and `npm run generate` backfills the gap.
 */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { laneById } from '../src/lib/topics.js'
import { validateItem } from '../src/lib/validate.js'
import { ROOT, runClaude, withRetry } from './claudeCli.js'
import { idsOf, loadBank, parseJsonArray, saveBank } from './bank.js'
import { itemId } from '../src/lib/items.js'

const DEFAULTS = { lane: '', from: 0, to: Infinity, chunk: 10, parallel: 4, model: 'opus', apply: false }

function buildPrompt(laneId, entries) {
  return `You are a native English teacher reviewing multiple-choice questions for Hebrew-speaking teens and adults.
Lane: ${laneId}.

Check every item for:
1. Exactly ONE option is right. If a native speaker would accept another option too, that's a problem.
2. Each wrong option is really wrong (not just less common or a bit informal).
3. The right answer and all lines are natural, modern, everyday English.
4. Only common words — nothing rare, bookish or old-fashioned.
5. "why" is correct, short and plain.
6. Nothing about sex, violence, weapons, drugs, alcohol or death.
7. For conversations: each line follows naturally from the RIGHT reply before it.
8. The right answer must not stand out by length or style.

For each item return one verdict:
- "ok" if it is fine as is.
- "fix" with a corrected "item" in exactly the same JSON shape (same topic; keep it as close to the original as possible).
- "drop" if it can't be saved.

Return ONLY a JSON array, no prose and no code fences:
[{"index":<index>,"verdict":"ok"|"fix"|"drop","reason":"<short, empty if ok>","item":<only for fix>}]

Items:
${JSON.stringify(entries)}`
}

function parseArgs(argv) {
  const options = { ...DEFAULTS }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i].replace(/^--/, '')
    if (flag === 'apply') {
      options.apply = true
      continue
    }
    const value = argv[++i]
    if (!(flag in options) || value === undefined) continue
    options[flag] = typeof options[flag] === 'string' ? value : Number(value)
  }
  return options
}

/** Run `tasks` (functions returning promises) with at most `limit` in flight. */
async function inPool(tasks, limit) {
  const results = []
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

async function reviewChunk(laneId, bank, indexes, model) {
  const entries = indexes.map((index) => ({ index, ...bank[index] }))
  try {
    const verdicts = await withRetry(() => runClaude(buildPrompt(laneId, entries), { model, timeoutMs: 600_000 }).then(parseJsonArray))
    console.log(`  reviewed ${indexes[0]}–${indexes.at(-1)}`)
    return verdicts.filter((v) => indexes.includes(v.index))
  } catch (err) {
    console.log(`  chunk ${indexes[0]}–${indexes.at(-1)} failed: ${err.message.split('\n')[0]}`)
    return []
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!laneById(options.lane)) throw new Error('pass --lane everyday|phrasal|tenses')

  const bank = await loadBank(options.lane)
  const indexes = bank.map((_, i) => i).filter((i) => i >= options.from && i < options.to)
  const chunks = []
  for (let i = 0; i < indexes.length; i += options.chunk) chunks.push(indexes.slice(i, i + options.chunk))

  console.log(`${options.lane}: reviewing ${indexes.length} items in ${chunks.length} chunks`)
  const verdicts = (await inPool(chunks.map((chunk) => () => reviewChunk(options.lane, bank, chunk, options.model)), options.parallel)).flat()

  const report = []
  const replaced = new Map() // original item id -> rewritten item
  const dropped = new Set() // original item ids
  const otherIds = idsOf(bank)

  for (const verdict of verdicts) {
    if (verdict.verdict === 'ok') continue
    const original = bank[verdict.index]
    const id = itemId(original)
    if (verdict.verdict === 'fix') {
      const others = new Set([...otherIds].filter((other) => other !== id))
      const result = validateItem(options.lane, { ...verdict.item, topic: original.topic }, others)
      if (result.ok) {
        replaced.set(id, result.item)
        otherIds.add(itemId(result.item))
        report.push({ index: verdict.index, action: 'fixed', reason: verdict.reason, before: original, after: result.item })
        continue
      }
      report.push({ index: verdict.index, action: 'dropped', reason: `${verdict.reason} (rewrite invalid: ${result.reason})`, before: original })
    } else {
      report.push({ index: verdict.index, action: 'dropped', reason: verdict.reason, before: original })
    }
    dropped.add(id)
  }

  await writeFile(resolve(ROOT, `review-report-${options.lane}.json`), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${options.lane}: ${verdicts.length} verdicts, ${replaced.size} fixed, ${dropped.size} dropped (see review-report-${options.lane}.json)`)

  if (!options.apply) return console.log('dry run — pass --apply to write the bank')
  // Re-read and match by id, so items added by `generate` during the review are kept.
  const current = await loadBank(options.lane)
  const next = current.flatMap((item) => {
    const id = itemId(item)
    return dropped.has(id) ? [] : [replaced.get(id) ?? item]
  })
  await saveBank(options.lane, next)
  console.log(`${options.lane}: bank now ${next.length} items`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
