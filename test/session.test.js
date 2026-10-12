import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearState, readState, writeState } from '../src/lib/session.js'

const P = 'player-1'

/** Minimal in-memory stand-in for the browser's sessionStorage. */
function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  }
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', fakeStorage())
  vi.stubGlobal('localStorage', fakeStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session state', () => {
  it('returns null when nothing is stored', () => {
    expect(readState(P)).toBeNull()
  })

  it('round-trips state', () => {
    writeState(P, { screen: 'quiz', roundId: 3 })
    expect(readState(P)).toEqual({ screen: 'quiz', roundId: 3 })
  })

  it('merges successive writes instead of replacing', () => {
    writeState(P, { screen: 'quiz', roundId: 3 })
    writeState(P, { progress: { index: 5 } })
    expect(readState(P)).toEqual({ screen: 'quiz', roundId: 3, progress: { index: 5 } })
  })

  it('lets a later write override an earlier key', () => {
    writeState(P, { screen: 'quiz' })
    writeState(P, { screen: 'summary' })
    expect(readState(P).screen).toBe('summary')
  })

  it('clears', () => {
    writeState(P, { screen: 'quiz' })
    clearState(P)
    expect(readState(P)).toBeNull()
  })

  it('survives corrupt stored data', () => {
    sessionStorage.setItem(`english-of-fun:round:${P}`, '{not json')
    expect(readState(P)).toBeNull()
  })

  it('ignores stored data that is not an object', () => {
    sessionStorage.setItem(`english-of-fun:round:${P}`, '"a string"')
    expect(readState(P)).toBeNull()
  })

  it('never throws when storage itself is unavailable', () => {
    // Some privacy modes throw on every storage access.
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    })

    expect(readState(P)).toBeNull()
    expect(() => writeState(P, { screen: 'quiz' })).not.toThrow()
    expect(() => clearState(P)).not.toThrow()
  })

  it('never throws when there is no storage at all (server-side render)', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(readState(P)).toBeNull()
    expect(() => writeState(P, { screen: 'quiz' })).not.toThrow()
    expect(() => clearState(P)).not.toThrow()
  })
})
