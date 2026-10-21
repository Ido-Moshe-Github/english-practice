import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDailyCount, DAILY_PLAN, dailyCount, isLastDailyStep, recordDailyDone } from '../src/lib/daily.js'

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

describe('daily practice', () => {
  it('plays one round of every lane, in lane order', () => {
    expect(DAILY_PLAN).toEqual(['everyday', 'phrasal', 'tenses', 'prepositions'])
  })

  it('knows its last step', () => {
    expect(isLastDailyStep(DAILY_PLAN.length - 1)).toBe(true)
    expect(isLastDailyStep(0)).toBe(false)
  })
})

describe('daily count', () => {
  beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('starts at zero and counts each finished practice, per player', () => {
    expect(dailyCount('p1')).toBe(0)
    recordDailyDone('p1')
    recordDailyDone('p1')
    recordDailyDone('p2')
    expect(dailyCount('p1')).toBe(2)
    expect(dailyCount('p2')).toBe(1)
  })

  it('clears for one player only', () => {
    recordDailyDone('p1')
    recordDailyDone('p2')
    clearDailyCount('p1')
    expect(dailyCount('p1')).toBe(0)
    expect(dailyCount('p2')).toBe(1)
  })

  it('treats a broken stored value as zero', () => {
    localStorage.setItem('english-of-fun:daily:p1', '{"completed":"lots"}')
    expect(dailyCount('p1')).toBe(0)
  })
})
