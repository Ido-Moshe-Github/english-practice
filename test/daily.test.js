import { describe, expect, it } from 'vitest'
import { DAILY_PLAN, isLastDailyStep } from '../src/lib/daily.js'

describe('daily practice', () => {
  it('plays one round of every lane, in lane order', () => {
    expect(DAILY_PLAN).toEqual(['everyday', 'phrasal', 'tenses', 'prepositions'])
  })

  it('knows its last step', () => {
    expect(isLastDailyStep(DAILY_PLAN.length - 1)).toBe(true)
    expect(isLastDailyStep(0)).toBe(false)
  })
})
