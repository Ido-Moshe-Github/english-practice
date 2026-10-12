#!/usr/bin/env node
/**
 * Grow the question banks using the local Claude Code CLI, which bills against
 * your Claude subscription rather than an API key.
 *
 *   npm run generate -- --lane tenses                       # top every topic up to 30
 *   npm run generate -- --lane tenses --topic conditionals
 *   npm run generate -- --lane everyday --count 40
 *
 * Generation happens here, at authoring time — the app never calls an LLM.
 * Every item passes src/lib/validate.js before it's kept; `npm run review`
 * afterwards checks that the English is natural and the answer is the only right one.
 */
import { LANES, laneById } from '../src/lib/topics.js'
import { validateItem } from '../src/lib/validate.js'
import { itemId } from '../src/lib/items.js'
import { runClaude, withRetry } from './claudeCli.js'
import { loadBank, parseJsonArray, saveBank, idsOf } from './bank.js'

const DEFAULTS = { lane: '', topic: '', count: 30, batch: 10, model: 'sonnet', maxBatches: 40 }

const SHARED_RULES = `Audience: Hebrew-speaking teens and adults who already get by in English.
Language rules:
- Natural, modern, everyday English, as people really speak it. American or British is fine, but be consistent inside an item.
- Common words only. Never rare, bookish or old-fashioned words. Casual phrases and mild slang are welcome.
- Nothing about sex, violence, weapons, drugs, alcohol or death. Keep it friendly and everyday.
- Exactly ONE option is right. The three wrong options must be clearly wrong to a native speaker — not just "less common".
- Wrong options are TYPICAL learner mistakes: word-for-word translation from Hebrew, wrong tense, wrong preposition or particle, wrong word order, or too blunt/rude for the situation.
- All four options must be about the same length and style, so length never gives the answer away.
- "why" is one short plain-English line (max ~25 words) that explains the right answer. No grammar jargon a normal person wouldn't know, except tense names.
- Vary names, places, and sentence patterns across items.`

const LANE_PROMPTS = {
  everyday: (topic, size) => `Write ${size} short multiple-choice CONVERSATIONS for practising everyday English.
Topic: ${topic.label}.

${SHARED_RULES}
- Each conversation: a one-sentence "situation" (second person: "You're at…"), then 2 or 3 turns.
- Each turn: "line" is what the other person says, starting with who they are ("Waiter: …", "Receptionist: …", "Friend: …"). The learner picks THEIR reply from 4 options.
- Later lines must follow naturally from the RIGHT reply to the previous turn.
- Mix 2-turn and 3-turn conversations.

Return ONLY a JSON array, no prose and no code fences. Each element:
{"topic":"${topic.id}","situation":"...","turns":[{"line":"...","options":["...","...","...","..."],"answer":"<exact copy of the right option>","why":"..."}]}`,

  phrasal: (topic, size) => `Write ${size} multiple-choice questions practising PHRASAL VERBS with "${topic.label}".

${SHARED_RULES}
- Use phrasal verbs people really use in daily life (e.g. for "get": get up, get along with, get over, get by, get back, get away with). Spread them out — don't repeat the same phrasal verb more than twice in a batch.
- Mix two kinds of question:
  1. Fill the gap: "prompt" is a sentence with ___ ; options are phrasal verbs from the same family (or same particle, different verb), correctly conjugated.
  2. Meaning: "prompt" quotes a sentence using the phrasal verb in **double asterisks** and asks what it means; options are plain-English meanings.
- "context" is an optional short line setting the scene (may be omitted).

Return ONLY a JSON array, no prose and no code fences. Each element:
{"topic":"${topic.id}","context":"...","prompt":"...","options":["...","...","...","..."],"answer":"<exact copy of the right option>","why":"..."}`,

  tenses: (topic, size) => `Write ${size} multiple-choice questions practising English TENSES.
Focus: ${topic.label}.

${SHARED_RULES}
- "prompt" is one natural sentence with one or two gaps written ___ . Options fill the gap(s); for two gaps write them as "had known / would have come".
- The context must make exactly one tense correct. Use time words and situations that decide it.
- Wrong options are the tenses learners really confuse here.
- "context" is an optional short line setting the scene (may be omitted).

Return ONLY a JSON array, no prose and no code fences. Each element:
{"topic":"${topic.id}","context":"...","prompt":"...","options":["...","...","...","..."],"answer":"<exact copy of the right option>","why":"..."}`,
}

function parseArgs(argv) {
  const options = { ...DEFAULTS }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]?.replace(/^--/, '')
    const value = argv[i + 1]
    if (!(flag in options) || value === undefined) continue
    options[flag] = typeof options[flag] === 'string' ? value : Number(value)
  }
  return options
}

async function fillTopic(lane, topic, options) {
  for (let batch = 0; batch < options.maxBatches; batch++) {
    const bank = await loadBank(lane.id)
    const have = bank.filter((item) => item.topic === topic.id).length
    if (have >= options.count) return console.log(`${lane.id}/${topic.id}: ${have} — done`)

    const size = Math.min(options.batch, options.count - have + 2)
    process.stdout.write(`${lane.id}/${topic.id}: ${have}/${options.count}, asking for ${size}... `)

    let candidates
    try {
      candidates = await withRetry(
        async () => parseJsonArray(await runClaude(LANE_PROMPTS[lane.id](topic, size), { model: options.model })),
        (err) => process.stdout.write(`retrying (${err.message.slice(0, 60)})... `)
      )
    } catch (err) {
      console.log(`failed: ${err.message.split('\n')[0]}`)
      continue
    }

    const fresh = await loadBank(lane.id) // re-read: a parallel run may have written meanwhile
    const ids = idsOf(fresh)
    let added = 0
    for (const candidate of candidates) {
      const result = validateItem(lane.id, { ...candidate, topic: topic.id }, ids)
      if (!result.ok) {
        console.log(`\n  rejected: ${result.reason}`)
        continue
      }
      fresh.push(result.item)
      ids.add(itemId(result.item))
      added++
    }
    await saveBank(lane.id, fresh)
    console.log(`+${added}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const lanes = options.lane ? [laneById(options.lane)] : LANES
  if (lanes.includes(null)) throw new Error(`unknown lane "${options.lane}": ${LANES.map((l) => l.id).join(', ')}`)

  for (const lane of lanes) {
    const topics = options.topic ? lane.topics.filter((t) => t.id === options.topic) : lane.topics
    if (!topics.length) throw new Error(`no topic "${options.topic}" in ${lane.id}`)
    for (const topic of topics) await fillTopic(lane, topic, options)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
