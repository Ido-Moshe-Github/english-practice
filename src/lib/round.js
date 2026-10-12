import { nextItems } from './queue.js'
import { topicItems } from './banks.js'
import { laneById } from './topics.js'
import { toTurns } from './items.js'

/**
 * A round is 10 items played turn by turn. A single question is one turn; a
 * conversation is 2-3. Everything here is plain data in, plain data out, so a
 * round can be saved to sessionStorage and resumed exactly as it was —
 * including the shuffled order of the options.
 *
 *   round = { laneId, topicId, items: [{ id, topic, intro, turns }], at: { item, turn }, picks: [] }
 *   pick  = { item, turn, choice, correct }
 */
export const ROUND_SIZE = 10
export const MIXED = 'mixed'

function shuffled(list, rng) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** The topics to draw from, in the order they take turns. Mixed starts at a random one. */
function topicCycle(laneId, topicId, rng) {
  if (topicId !== MIXED) return [topicId]
  const topics = laneById(laneId).topics.map((topic) => topic.id)
  const start = Math.floor(rng() * topics.length)
  return [...topics.slice(start), ...topics.slice(0, start)]
}

function pickItems(playerId, laneId, topicId, rng, poolOf) {
  const picked = []
  const taken = new Set()
  let topics = topicCycle(laneId, topicId, rng)

  while (picked.length < ROUND_SIZE && topics.length) {
    const stillGoing = []
    for (const topic of topics) {
      if (picked.length === ROUND_SIZE) break
      const want = topicId === MIXED ? 1 : ROUND_SIZE
      const items = nextItems(playerId, laneId, topic, want, { exclude: taken, pool: poolOf(topic) })
      for (const item of items) {
        picked.push(item)
        taken.add(item.id)
      }
      if (items.length) stillGoing.push(topic)
    }
    topics = topicId === MIXED ? stillGoing : []
  }
  return picked
}

function toRoundItem(item, rng) {
  const { intro, turns } = toTurns(item)
  return {
    id: item.id,
    topic: item.topic,
    intro,
    turns: turns.map((turn) => ({ ...turn, options: shuffled(turn.options, rng) })),
  }
}

export function buildRound(playerId, laneId, topicId, { rng = Math.random, poolOf = (topic) => topicItems(laneId, topic) } = {}) {
  const items = pickItems(playerId, laneId, topicId, rng, poolOf).map((item) => toRoundItem(item, rng))
  return { laneId, topicId, items, at: { item: 0, turn: 0 }, picks: [] }
}

/** True for something shaped like a round, e.g. one restored from sessionStorage by an older version. */
export function isRound(value) {
  return (
    Boolean(laneById(value?.laneId)) &&
    Array.isArray(value.items) &&
    value.items.every((item) => Array.isArray(item?.turns) && item.turns.length > 0) &&
    Number.isInteger(value.at?.item) &&
    Number.isInteger(value.at?.turn) &&
    Array.isArray(value.picks)
  )
}

export function isFinished(round) {
  return round.at.item >= round.items.length
}

const pickAt = (round, itemIndex, turnIndex) =>
  round.picks.find((pick) => pick.item === itemIndex && pick.turn === turnIndex) ?? null

/** Where the round stands: the turn to answer, and the pick if it's answered already. Null once finished. */
export function currentTurn(round) {
  if (isFinished(round)) return null
  const { item: itemIndex, turn: turnIndex } = round.at
  const item = round.items[itemIndex]
  return { item, turn: item.turns[turnIndex], itemIndex, turnIndex, pick: pickAt(round, itemIndex, turnIndex) }
}

/**
 * Answer the current turn. `finished` is set when that was the item's last
 * turn, so the caller can record the item in the queue right away.
 */
export function answer(round, choice) {
  const current = currentTurn(round)
  if (!current || current.pick) return { round, finished: null }

  const { item, turn, itemIndex, turnIndex } = current
  const picks = [...round.picks, { item: itemIndex, turn: turnIndex, choice, correct: choice === turn.answer }]
  const next = { ...round, picks }

  const isLastTurn = turnIndex === item.turns.length - 1
  const finished = isLastTurn
    ? { id: item.id, topic: item.topic, correct: picks.filter((p) => p.item === itemIndex).every((p) => p.correct) }
    : null
  return { round: next, finished }
}

/** Move on to the next turn or item. Does nothing until the current turn is answered. */
export function advance(round) {
  const current = currentTurn(round)
  if (!current?.pick) return round

  const { item, itemIndex, turnIndex } = current
  const at = turnIndex < item.turns.length - 1 ? { item: itemIndex, turn: turnIndex + 1 } : { item: itemIndex + 1, turn: 0 }
  return { ...round, at }
}

export function scoreRound(round) {
  const perfect = round.items.filter((_, index) => {
    const picks = round.picks.filter((p) => p.item === index)
    return picks.length > 0 && picks.every((p) => p.correct)
  }).length

  const mistakes = round.picks
    .filter((pick) => !pick.correct)
    .map((pick) => {
      const item = round.items[pick.item]
      const turn = item.turns[pick.turn]
      return { intro: item.intro, line: turn.line, choice: pick.choice, answer: turn.answer, why: turn.why }
    })

  return {
    total: round.items.length,
    perfect,
    picks: round.picks.length,
    rightPicks: round.picks.filter((p) => p.correct).length,
    mistakes,
  }
}
