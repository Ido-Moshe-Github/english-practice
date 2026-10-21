import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDailyCount, DAILY_PLAN, dailyCount, dailyDoneToday, dayOf, isLastDailyStep, recordDailyDone } from '../src/lib/daily.js'

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

  it('is done today only on the day it was finished', () => {
    const evening = new Date(2026, 9, 21, 23, 30)
    expect(dailyDoneToday('p1', evening)).toBe(false)
    recordDailyDone('p1', evening)
    expect(dailyDoneToday('p1', new Date(2026, 9, 21, 8, 0))).toBe(true)
    expect(dailyDoneToday('p1', new Date(2026, 9, 22, 0, 5))).toBe(false)
    expect(dailyDoneToday('p2', evening)).toBe(false)
  })

  it('names the local calendar day', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('treats a broken stored value as zero', () => {
    localStorage.setItem('english-of-fun:daily:p1', '{"completed":"lots"}')
    expect(dailyCount('p1')).toBe(0)
  })
})
