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

/**
 * How many daily practices each player has finished, and the day of the last
 * one, kept in localStorage: { completed, lastDay: 'YYYY-MM-DD' }.
 */
const countKey = (playerId) => key('daily', playerId)

const readRecord = (playerId) => (playerId ? readJson('localStorage', countKey(playerId)) : null) ?? {}

/** The local calendar day, so "today" flips at the player's midnight, not UTC's. */
export function dayOf(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function dailyCount(playerId) {
  const { completed } = readRecord(playerId)
  return Number.isInteger(completed) && completed > 0 ? completed : 0
}

export function dailyDoneToday(playerId, now = new Date()) {
  return readRecord(playerId).lastDay === dayOf(now)
}

export function recordDailyDone(playerId, now = new Date()) {
  if (playerId) writeJson('localStorage', countKey(playerId), { completed: dailyCount(playerId) + 1, lastDay: dayOf(now) })
}

export function clearDailyCount(playerId) {
  if (playerId) removeKey('localStorage', countKey(playerId))
}
