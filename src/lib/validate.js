import { laneById, topicById } from './topics.js'
import { itemId } from './items.js'

/**
 * The mechanical checks every item must pass before it enters a bank. They
 * catch what code can catch; whether the English is natural and the answer is
 * the only right one is left to `npm run review`.
 */
const OPTION_COUNT = 4
const MAX_OPTION_LENGTH = 120
const WHY_LENGTH = { min: 10, max: 200 }
/** The right answer may not stand out as the obviously longest option. */
const MAX_ANSWER_LENGTH_RATIO = 1.5
const TURNS = { min: 2, max: 3 }

/** Whole words only, so "skill" is fine even though it contains "kill". */
const BLOCKED = /\b(sex|sexy|naked|kill|killed|killing|murder|gun|guns|shoot|shot|stab|blood|bloody|rape|drunk|drugs|weapon|bomb|suicide|porn)\b/i

const text = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
const sameText = (value) => text(value).toLowerCase()

/** Returns null when the turn is fine, or the reason it isn't. */
function turnProblem(turn, lineField) {
  if (!turn.line) return `missing ${lineField}`
  if (turn.options.length !== OPTION_COUNT) return `needs ${OPTION_COUNT} options`
  if (turn.options.some((option) => !option)) return 'empty option'
  if (new Set(turn.options.map(sameText)).size !== OPTION_COUNT) return 'options must be distinct'
  if (turn.options.some((option) => option.length > MAX_OPTION_LENGTH)) return 'option too long'
  if (!turn.options.includes(turn.answer)) return 'answer is not one of the options'
  if (turn.why.length < WHY_LENGTH.min || turn.why.length > WHY_LENGTH.max) return 'why missing or wrong length'

  const longestWrong = Math.max(...turn.options.filter((o) => o !== turn.answer).map((o) => o.length))
  if (turn.answer.length > longestWrong * MAX_ANSWER_LENGTH_RATIO) return 'answer gives itself away by length'

  return null
}

function cleanTurn(raw, lineField) {
  return {
    line: text(raw?.[lineField]),
    options: Array.isArray(raw?.options) ? raw.options.map(text) : [],
    answer: text(raw?.answer),
    why: text(raw?.why),
  }
}

function allText(item) {
  return JSON.stringify(item)
}

/**
 * Check one generated item for a lane. Returns { ok: true, item } with the item
 * cleaned up (trimmed, unknown fields dropped), or { ok: false, reason }.
 */
export function validateItem(laneId, raw, existingIds = new Set()) {
  const fail = (reason) => ({ ok: false, reason })

  const lane = laneById(laneId)
  if (!lane) return fail(`unknown lane "${laneId}"`)
  if (!topicById(laneId, raw?.topic)) return fail(`unknown topic "${raw?.topic}" for ${laneId}`)

  let item
  if (lane.conversation) {
    if (!Array.isArray(raw.turns) || raw.turns.length < TURNS.min || raw.turns.length > TURNS.max) {
      return fail(`needs ${TURNS.min}-${TURNS.max} turns`)
    }
    const situation = text(raw.situation)
    if (!situation) return fail('missing situation')

    const turns = raw.turns.map((turn) => cleanTurn(turn, 'line'))
    for (const [index, turn] of turns.entries()) {
      const problem = turnProblem(turn, 'line')
      if (problem) return fail(`turn ${index + 1}: ${problem}`)
    }
    item = { topic: raw.topic, situation, turns }
  } else {
    const { line, ...turn } = cleanTurn({ ...raw, line: raw.prompt }, 'line')
    const problem = turnProblem({ line, ...turn }, 'prompt')
    if (problem) return fail(problem.replace('missing line', 'missing prompt'))

    const context = text(raw.context)
    item = { topic: raw.topic, ...(context && { context }), prompt: line, ...turn }
  }

  const blocked = BLOCKED.exec(allText(item))
  if (blocked) return fail(`blocked word "${blocked[0]}"`)
  if (existingIds.has(itemId(item))) return fail('duplicate')

  return { ok: true, item }
}
