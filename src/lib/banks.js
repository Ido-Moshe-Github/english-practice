import everyday from '../data/everyday.json'
import phrasal from '../data/phrasal.json'
import tenses from '../data/tenses.json'
import prepositions from '../data/prepositions.json'
import { itemId } from './items.js'

/**
 * The bundled question banks, generated ahead of time by `npm run generate` —
 * no network call, no API key, no waiting. Each item gets its id here once.
 */
const withIds = (items) => items.map((item) => ({ ...item, id: itemId(item) }))

const BANKS = { everyday: withIds(everyday), phrasal: withIds(phrasal), tenses: withIds(tenses), prepositions: withIds(prepositions) }

/** Items of one topic, in bank order. */
export function topicItems(laneId, topicId) {
  return (BANKS[laneId] ?? []).filter((item) => item.topic === topicId)
}
