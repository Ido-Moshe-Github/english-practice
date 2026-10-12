/**
 * Guarded JSON access to browser storage.
 *
 * Every call is wrapped: storage throws outright in some privacy modes, and it
 * doesn't exist at all under server-side rendering. None of what we keep here
 * is essential — losing it costs a resumed round or some repeat-avoidance, not
 * correctness — so failure is always silent rather than fatal.
 */
/** Namespace for everything this app stores, so it can't collide with anything else. */
export const PREFIX = 'english-of-fun'

/** Build a namespaced storage key: key('queue', id) -> 'english-of-fun:queue:<id>'. */
export function key(...parts) {
  return [PREFIX, ...parts].join(':')
}

function store(kind) {
  try {
    return globalThis[kind] ?? null
  } catch {
    return null
  }
}

export function readJson(kind, key) {
  try {
    const raw = store(kind)?.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeJson(kind, key, value) {
  try {
    store(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable */
  }
}

export function removeKey(kind, key) {
  try {
    store(kind)?.removeItem(key)
  } catch {
    /* nothing to do */
  }
}
