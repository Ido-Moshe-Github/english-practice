import { describe, expect, it } from 'vitest'
import { LANES } from '../src/lib/topics.js'
import { validateItem } from '../src/lib/validate.js'
import { itemId } from '../src/lib/items.js'
import everyday from '../src/data/everyday.json'
import phrasal from '../src/data/phrasal.json'
import tenses from '../src/data/tenses.json'

/** The bundled banks must pass the same checks the generator applies, so a hand edit can't ship a broken item. */
const BANKS = { everyday, phrasal, tenses }

describe.each(LANES.map((lane) => [lane.id]))('bank %s', (laneId) => {
  const bank = BANKS[laneId]

  it('has only valid items', () => {
    const problems = bank
      .map((item, index) => ({ index, reason: validateItem(laneId, item).reason }))
      .filter((result) => result.reason)
    expect(problems).toEqual([])
  })

  it('has no duplicates', () => {
    expect(new Set(bank.map(itemId)).size).toBe(bank.length)
  })
})
