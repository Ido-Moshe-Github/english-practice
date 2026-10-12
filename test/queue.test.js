import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearQueue, nextItems, recordResult, topicProgress } from '../src/lib/queue.js'

const P = 'p1'
const L = 'tenses'
const T = 'conditionals'
const pool = ['a', 'b', 'c', 'd'].map((id) => ({ id, topic: T }))
const ids = (items) => items.map((item) => item.id)

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

const next = (n, exclude) => ids(nextItems(P, L, T, n, { pool, exclude }))
const record = (id, correct) => recordResult(P, L, T, id, correct, pool)
const progress = () => topicProgress(P, L, T, pool)

describe('queue', () => {
  it('starts in bank order', () => {
    expect(next(2)).toEqual(['a', 'b'])
    expect(progress()).toEqual({ done: 0, required: 4, complete: false })
  })

  it('clears a right answer', () => {
    record('a', true)
    expect(next(2)).toEqual(['b', 'c'])
    expect(progress().done).toBe(1)
  })

  it('sends a wrong answer to the back', () => {
    record('a', false)
    expect(next(4)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('fills a round with already-mastered items once the rest run out', () => {
    record('a', true)
    record('b', true)
    expect(next(4)).toEqual(['c', 'd', 'a', 'b'])
  })

  it('un-masters an item answered wrong again', () => {
    record('a', true)
    record('a', false)
    expect(progress().done).toBe(0)
    expect(next(4)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('never returns more than the pool, and honours exclude', () => {
    expect(next(10)).toHaveLength(4)
    expect(next(10, new Set(['a', 'c']))).toEqual(['b', 'd'])
  })

  it('marks the topic complete and starts over', () => {
    for (const item of pool) record(item.id, true)
    expect(progress()).toEqual({ done: 4, required: 4, complete: true })
    expect(next(1)).toEqual(['a'])
    record('a', true)
    expect(progress()).toEqual({ done: 4, required: 4, complete: true })
  })

  it('ignores stored ids that are no longer in the bank', () => {
    record('a', true)
    record('gone', true)
    record('ghost', false)
    expect(progress().done).toBe(1)
    expect(next(4)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('reads garbage storage as empty', () => {
    localStorage.setItem(`english-of-fun:queue:${P}`, '{"tenses":{"conditionals":{"solved":"x","deferred":[1,null]}}}')
    expect(progress().done).toBe(0)
    expect(next(1)).toEqual(['a'])
  })

  it('keeps players apart and can be cleared', () => {
    record('a', true)
    expect(topicProgress('p2', L, T, pool).done).toBe(0)
    clearQueue(P)
    expect(progress().done).toBe(0)
  })

  it('does nothing without a player', () => {
    expect(() => recordResult(null, L, T, 'a', true, pool)).not.toThrow()
  })
})
