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

const DEFAULTS = { lane: '', topic: '', count: 30, batch: 10, model: 'sonnet', maxBatches: 40, parallel: 1 }

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

IMPORTANT — this lane is different from a grammar quiz:
- NEVER write broken or ungrammatical English, in any option. Every option must be fluent, natural English a native speaker could say.
- What makes a wrong option wrong is that it does not FIT: it misunderstands what the other person said, answers a different question, misreads an idiom or slang ("Are you all set?", "grab a bite", "you're good", "my treat"), or is the wrong tone for the situation.
- The learner should have to understand the other person's line to choose — not just spot bad grammar.
- If the other person asks an open or preference question ("together or separately?", "for here or to go?"), the situation or an earlier line must make only ONE reply right. Never leave two sensible answers.
- Gaps must test something worth learning (a collocation, preposition, phrasal verb, set phrase) — never just "please" or "thanks".

Format:
- "situation": one short sentence, second person ("You're at…").
- 2 or 3 turns. Each turn: "line" is what the other person says, starting with who they are ("Waiter: …", "Receptionist: …", "Friend: …").
- Two kinds of turn — EVERY conversation must have at least one of each:
  - "kind":"reply": the learner picks their whole reply. 4 options, each at most 10 words.
  - "kind":"gap": "reply" is the learner's reply with one missing piece written ___ (a collocation, preposition, phrasal verb or set phrase, e.g. "Could I ___ the bill, please?"). 4 options of 1-3 words; only one is natural there.
- Later lines must follow naturally from the RIGHT reply to the previous turn.
- Use real-life expressions people actually say, including casual ones.

Example of the style:
{"topic":"food","situation":"You're at a café with a friend.","turns":[
 {"kind":"reply","line":"Waiter: Are you all set?","options":["Yes, we're ready to order.","Yes, we've already paid, thanks.","Sure, you can set the table now.","Yes, a table for two, please."],"answer":"Yes, we're ready to order.","why":"'Are you all set?' asks if you're ready — here, ready to order."},
 {"kind":"gap","line":"Waiter: Great. What can I get you?","reply":"Could I ___ the chicken salad, please?","options":["have","take","make","bring"],"answer":"have","why":"'Could I have…' is the natural way to order. You don't 'take' food from the waiter."}]}

Return ONLY a JSON array, no prose and no code fences. Each element:
{"topic":"${topic.id}","situation":"...","turns":[{"kind":"reply","line":"...","options":["...","...","...","..."],"answer":"<exact copy of the right option>","why":"..."},{"kind":"gap","line":"...","reply":"... ___ ...","options":["...","...","...","..."],"answer":"<exact copy>","why":"..."}]}`,

  phrasal: (topic, size, existing) => `Write ${size} multiple-choice questions practising PHRASAL VERBS with "${topic.label}".
${existing.length ? `\nThe bank already has questions whose right answers are: ${existing.join('; ')}.\nPrefer phrasal verbs and meanings NOT on that list — other particles, other common meanings — so the bank covers as many everyday combinations as possible.\n` : ''}
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

/**
 * Topics of one lane can be generated in parallel (--parallel), but they share
 * one bank file, so each read-validate-write step holds this lock.
 */
let bankLock = Promise.resolve()
function withBankLock(fn) {
  const run = bankLock.then(fn)
  bankLock = run.catch(() => {})
  return run
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
        async () => {
          const existing = bank.filter((item) => item.topic === topic.id).map((item) => item.answer)
          return parseJsonArray(await runClaude(LANE_PROMPTS[lane.id](topic, size, existing), { model: options.model }))
        },
        (err) => process.stdout.write(`retrying (${err.message.slice(0, 60)})... `)
      )
    } catch (err) {
      console.log(`failed: ${err.message.split('\n')[0]}`)
      continue
    }

    // Re-read just before writing. Don't run two generate processes on one lane at once.
    const added = await withBankLock(async () => {
      const fresh = await loadBank(lane.id)
      const ids = idsOf(fresh)
      let count = 0
      for (const candidate of candidates) {
        const result = validateItem(lane.id, { ...candidate, topic: topic.id }, ids)
        if (!result.ok) {
          console.log(`\n  rejected: ${result.reason}`)
          continue
        }
        fresh.push(result.item)
        ids.add(itemId(result.item))
        count++
      }
      await saveBank(lane.id, fresh)
      return count
    })
    console.log(`${lane.id}/${topic.id}: +${added}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const lanes = options.lane ? [laneById(options.lane)] : LANES
  if (lanes.includes(null)) throw new Error(`unknown lane "${options.lane}": ${LANES.map((l) => l.id).join(', ')}`)

  for (const lane of lanes) {
    const topics = options.topic ? lane.topics.filter((t) => t.id === options.topic) : lane.topics
    if (!topics.length) throw new Error(`no topic "${options.topic}" in ${lane.id}`)
    const queue = [...topics]
    const worker = async () => {
      while (queue.length) await fillTopic(lane, queue.shift(), options)
    }
    await Promise.all(Array.from({ length: Math.max(1, options.parallel) }, worker))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
