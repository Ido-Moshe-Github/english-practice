import { LANES } from './topics.js'
import { key, readJson, removeKey, writeJson } from './storage.js'

/**
 * Daily practice: a fixed run of rounds, one from each lane in order. Each
 * round is a Mixed round, and the queue serves unseen questions first, so
 * every round brings questions the player hasn't met yet.
 */
export const ROUNDS_PER_LANE = 1

export const DAILY_PLAN = LANES.flatMap((lane) => Array(ROUNDS_PER_LANE).fill(lane.id))

export const isLastDailyStep = (step) => step === DAILY_PLAN.length - 1

/** How many daily practices each player has finished, kept in localStorage: { completed }. */
const countKey = (playerId) => key('daily', playerId)

export function dailyCount(playerId) {
  const completed = playerId ? readJson('localStorage', countKey(playerId))?.completed : 0
  return Number.isInteger(completed) && completed > 0 ? completed : 0
}

export function recordDailyDone(playerId) {
  if (playerId) writeJson('localStorage', countKey(playerId), { completed: dailyCount(playerId) + 1 })
}

export function clearDailyCount(playerId) {
  if (playerId) removeKey('localStorage', countKey(playerId))
}
