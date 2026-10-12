import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { advance, answer, buildRound, currentTurn, isFinished, scoreRound, MIXED, ROUND_SIZE } from '../src/lib/round.js'
import { topicProgress } from '../src/lib/queue.js'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()))
afterEach(() => vi.unstubAllGlobals())

const single = (topic, n) => ({
  id: `${topic}-${n}`,
  topic,
  context: `context ${n}`,
  prompt: `prompt ${n}`,
  options: ['right', 'w1', 'w2', 'w3'],
  answer: 'right',
  why: 'because',
})

const conversation = (topic, n) => ({
  id: `${topic}-${n}`,
  topic,
  situation: `situation ${n}`,
  turns: [1, 2].map((t) => ({ line: `line ${t}`, options: ['right', 'w1', 'w2', 'w3'], answer: 'right', why: 'because' })),
})

const bank = (make, topics, count) =>
  Object.fromEntries(topics.map((topic) => [topic, Array.from({ length: count }, (_, n) => make(topic, n))]))

/** Play a whole round, answering right unless `wrong(itemIndex, turnIndex)` says otherwise. */
function play(round, wrong = () => false) {
  while (!isFinished(round)) {
    const { turn, itemIndex, turnIndex } = currentTurn(round)
    const choice = wrong(itemIndex, turnIndex) ? turn.options.find((o) => o !== turn.answer) : turn.answer
    round = advance(answer(round, choice).round)
  }
  return round
}

describe('buildRound', () => {
  it('takes 10 items from one topic, in queue order', () => {
    const pools = bank(single, ['conditionals'], 30)
    const round = buildRound('p1', 'tenses', 'conditionals', { poolOf: (t) => pools[t] })
    expect(round.items.map((i) => i.id)).toEqual(pools.conditionals.slice(0, ROUND_SIZE).map((i) => i.id))
  })

  it('uses what a short topic has, without repeats', () => {
    const pools = bank(single, ['conditionals'], 3)
    const round = buildRound('p1', 'tenses', 'conditionals', { poolOf: (t) => pools[t] })
    expect(round.items).toHaveLength(3)
  })

  it('shuffles options but keeps the answer among them', () => {
    const pools = bank(single, ['conditionals'], 10)
    const round = buildRound('p1', 'tenses', 'conditionals', { poolOf: (t) => pools[t], rng: () => 0 })
    const turn = round.items[0].turns[0]
    expect(turn.options).not.toEqual(['right', 'w1', 'w2', 'w3'])
    expect([...turn.options].sort()).toEqual(['right', 'w1', 'w2', 'w3'])
    expect(turn.answer).toBe('right')
  })

  it('turns a single question into one turn with its context as intro', () => {
    const pools = bank(single, ['conditionals'], 1)
    const [item] = buildRound('p1', 'tenses', 'conditionals', { poolOf: (t) => pools[t] }).items
    expect(item.intro).toBe('context 0')
    expect(item.turns).toHaveLength(1)
    expect(item.turns[0].line).toBe('prompt 0')
  })

  it('Mixed cycles through every topic', () => {
    const topics = ['present', 'perfect', 'past', 'future', 'conditionals', 'mixed-wish', 'passive', 'reported']
    const pools = bank(single, topics, 5)
    const round = buildRound('p1', 'tenses', MIXED, { poolOf: (t) => pools[t] ?? [] })
    expect(round.items).toHaveLength(ROUND_SIZE)
    expect(new Set(round.items.map((i) => i.topic)).size).toBe(topics.length)
  })

  it('Mixed fills up from the other topics when some are empty', () => {
    const pools = { present: bank(single, ['present'], 30).present }
    const round = buildRound('p1', 'tenses', MIXED, { poolOf: (t) => pools[t] ?? [] })
    expect(round.items).toHaveLength(ROUND_SIZE)
    expect(new Set(round.items.map((i) => i.id)).size).toBe(ROUND_SIZE)
  })
})

describe('playing a round', () => {
  const pools = bank(conversation, ['directions'], 10)
  const build = () => buildRound('p1', 'everyday', 'directions', { poolOf: (t) => pools[t] })

  it('walks through every turn of every conversation', () => {
    const round = play(build())
    expect(isFinished(round)).toBe(true)
    expect(round.picks).toHaveLength(20)
  })

  it('reports an item as finished after its last turn, correct only if every turn was', () => {
    let round = build()
    const first = answer(round, 'w1')
    expect(first.finished).toBeNull()
    round = advance(first.round)
    const second = answer(round, currentTurn(round).turn.answer)
    expect(second.finished).toEqual({ id: 'directions-0', topic: 'directions', correct: false })
  })

  it('ignores a second answer to the same turn, and advancing before answering', () => {
    let round = build()
    expect(advance(round)).toBe(round)
    round = answer(round, 'w1').round
    expect(answer(round, 'right').round).toBe(round)
  })

  it('scores perfect conversations and right picks', () => {
    const round = play(build(), (item, turn) => item === 0 && turn === 1)
    const score = scoreRound(round)
    expect(score).toMatchObject({ total: 10, perfect: 9, picks: 20, rightPicks: 19 })
    expect(score.mistakes).toEqual([
      { intro: 'situation 0', line: 'line 2', choice: expect.stringMatching(/^w/), answer: 'right', why: 'because' },
    ])
  })

  it('survives a JSON round trip, as when resumed from storage', () => {
    let round = answer(build(), 'right').round
    round = JSON.parse(JSON.stringify(round))
    expect(currentTurn(round).pick.choice).toBe('right')
    expect(isFinished(play(advance(round)))).toBe(true)
  })

  it('does not touch the queue itself', () => {
    play(build())
    expect(topicProgress('p1', 'everyday', 'directions', pools.directions).done).toBe(0)
  })
})

describe('isRound', async () => {
  const { isRound } = await import('../src/lib/round.js')
  const pools = bank(single, ['conditionals'], 3)

  it('accepts a real round, also after a JSON round trip', () => {
    const round = buildRound('p1', 'tenses', 'conditionals', { poolOf: (t) => pools[t] })
    expect(isRound(JSON.parse(JSON.stringify(round)))).toBe(true)
  })

  it('rejects junk and rounds from an unknown lane', () => {
    expect(isRound(null)).toBe(false)
    expect(isRound({ laneId: 'tenses', items: 'x', at: { item: 0, turn: 0 }, picks: [] })).toBe(false)
    expect(isRound({ laneId: 'nope', items: [], at: { item: 0, turn: 0 }, picks: [] })).toBe(false)
  })
})
