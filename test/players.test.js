import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_NAME_LENGTH,
  activePlayer,
  addPlayer,
  cleanName,
  forgetPlayer,
  readPlayers,
  removePlayer,
  renamePlayer,
  setActivePlayer,
} from '../src/lib/players.js'

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

describe('cleanName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanName('  Maya   Sara  ')).toBe('Maya Sara')
  })

  it('caps the length', () => {
    expect(cleanName('a'.repeat(50)).length).toBe(MAX_NAME_LENGTH)
  })

  it('rejects nothing-but-space', () => {
    expect(cleanName('   ')).toBe('')
  })
})

describe('players', () => {
  it('starts empty', () => {
    expect(readPlayers()).toEqual({ players: [], active: null })
  })

  it('adds a player and makes them active', () => {
    const player = addPlayer('Maya')
    expect(player.name).toBe('Maya')
    expect(activePlayer().id).toBe(player.id)
  })

  it('refuses an empty name', () => {
    expect(addPlayer('   ')).toBeNull()
    expect(readPlayers().players).toHaveLength(0)
  })

  it('gives each player a distinct id', () => {
    const ids = new Set([addPlayer('A').id, addPlayer('B').id, addPlayer('C').id])
    expect(ids.size).toBe(3)
  })

  it('allows two people with the same name', () => {
    const a = addPlayer('Maya')
    const b = addPlayer('Maya')
    expect(a.id).not.toBe(b.id)
    expect(readPlayers().players).toHaveLength(2)
  })

  it('switches the active player', () => {
    const first = addPlayer('Maya')
    addPlayer('Noam')
    setActivePlayer(first.id)
    expect(activePlayer().name).toBe('Maya')
  })

  it('ignores a switch to an unknown id', () => {
    const player = addPlayer('Maya')
    setActivePlayer('nope')
    expect(activePlayer().id).toBe(player.id)
  })

  it('renames', () => {
    const player = addPlayer('Maya')
    renamePlayer(player.id, 'Maya R')
    expect(activePlayer().name).toBe('Maya R')
  })

  it('removes, and hands active over to whoever is left', () => {
    const first = addPlayer('Maya')
    const second = addPlayer('Noam')
    removePlayer(second.id)
    expect(readPlayers().players).toHaveLength(1)
    expect(activePlayer().id).toBe(first.id)
  })

  it('leaves nobody active once the last player is removed', () => {
    const player = addPlayer('Maya')
    removePlayer(player.id)
    expect(activePlayer()).toBeNull()
  })

  it('recovers from corrupt stored data', () => {
    localStorage.setItem('english-of-fun:players', '{"players":"not an array","active":7}')
    expect(readPlayers()).toEqual({ players: [], active: null })
  })

  it('repairs an active id that points at nobody', () => {
    const player = addPlayer('Maya')
    localStorage.setItem('english-of-fun:players', JSON.stringify({ players: [player], active: 'ghost' }))
    expect(activePlayer().id).toBe(player.id)
  })

  it('forgetPlayer clears the roster entry and all of that player\'s data', () => {
    const player = addPlayer('Maya')
    localStorage.setItem(`english-of-fun:queue:${player.id}`, '{"tenses":{}}')

    forgetPlayer(player.id)

    expect(readPlayers().players).toHaveLength(0)
    expect(localStorage.getItem(`english-of-fun:queue:${player.id}`)).toBeNull()
  })

  it('forgetPlayer leaves other players untouched', () => {
    const keep = addPlayer('Maya')
    const drop = addPlayer('Noam')
    localStorage.setItem(`english-of-fun:queue:${keep.id}`, '{"tenses":{}}')

    forgetPlayer(drop.id)

    expect(readPlayers().players.map((p) => p.id)).toEqual([keep.id])
    expect(localStorage.getItem(`english-of-fun:queue:${keep.id}`)).not.toBeNull()
  })

  it('does not throw without storage', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => addPlayer('Maya')).not.toThrow()
    expect(readPlayers().players).toEqual([])
  })
})
