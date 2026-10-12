import { key, readJson, writeJson } from './storage.js'
import { clearState } from './session.js'
import { clearQueue } from './queue.js'

/**
 * Who is playing. Several people can share one copy of the app, each with
 * their own progress and their own resumed round — so every other piece of stored state is keyed by player id.
 */
const KEY = key('players')

export const MAX_NAME_LENGTH = 12

/** Ids only have to be unique within one browser, never across machines. */
function newId() {
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

function normalise(stored) {
  const players = Array.isArray(stored?.players)
    ? stored.players.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
    : []
  const active = players.some((p) => p.id === stored?.active) ? stored.active : (players[0]?.id ?? null)
  return { players, active }
}

export function readPlayers() {
  return normalise(readJson('localStorage', KEY))
}

function save(state) {
  writeJson('localStorage', KEY, state)
  return state
}

export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH)
}

/** Add a player and make them active. Returns the new player, or null if the name is empty. */
export function addPlayer(name) {
  const clean = cleanName(name)
  if (!clean) return null

  const state = readPlayers()
  const player = { id: newId(), name: clean }
  save({ players: [...state.players, player], active: player.id })
  return player
}

export function setActivePlayer(id) {
  const state = readPlayers()
  if (!state.players.some((p) => p.id === id)) return state
  return save({ ...state, active: id })
}

export function activePlayer() {
  const state = readPlayers()
  return state.players.find((p) => p.id === state.active) ?? null
}

export function renamePlayer(id, name) {
  const clean = cleanName(name)
  if (!clean) return readPlayers()

  const state = readPlayers()
  return save({
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, name: clean } : p)),
  })
}

/**
 * Remove a player and everything stored about them — their place in every
 * topic queue and any round in progress. Without this the data would be
 * orphaned under an id nothing references any more.
 */
export function forgetPlayer(id) {
  clearQueue(id)
  clearState(id)
  return removePlayer(id)
}

/** Remove only the roster entry. Prefer forgetPlayer, which cleans up too. */
export function removePlayer(id) {
  const state = readPlayers()
  const players = state.players.filter((p) => p.id !== id)
  return save({ players, active: players.some((p) => p.id === state.active) ? state.active : (players[0]?.id ?? null) })
}
