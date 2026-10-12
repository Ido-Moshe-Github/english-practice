import { key, readJson, removeKey, writeJson } from './storage.js'

/**
 * Keeps the current round in sessionStorage so a page reload resumes where they
 * left off instead of dropping back to the home screen.
 *
 * sessionStorage (not localStorage) is deliberate: it clears when the tab
 * closes, so the app still starts fresh the next time it's opened. Keyed by
 * player, so two people sharing a device can't resume into each other's round.
 */
const keyFor = (playerId) => key('round', playerId)

export function readState(playerId) {
  return playerId ? readJson('sessionStorage', keyFor(playerId)) : null
}

/** Merge `patch` into the stored state. */
export function writeState(playerId, patch) {
  if (!playerId) return
  writeJson('sessionStorage', keyFor(playerId), { ...(readState(playerId) ?? {}), ...patch })
}

export function clearState(playerId) {
  if (playerId) removeKey('sessionStorage', keyFor(playerId))
}
