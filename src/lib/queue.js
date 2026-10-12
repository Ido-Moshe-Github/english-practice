import { topicItems } from './banks.js'
import { LANES } from './topics.js'
import { key, readJson, removeKey, writeJson } from './storage.js'

/**
 * Each topic is worked through as a queue, per player: items not seen yet in
 * bank order, then the ones answered wrong. A right answer masters an item; a
 * wrong one sends it to the back (and un-masters it, if it was mastered).
 * Once every item is mastered the topic is complete — the counter stays full
 * and the queue starts over.
 *
 * Stored shape: { [laneId]: { [topicId]: { solved: id[], deferred: id[], complete } } }
 */
const keyFor = (playerId) => key('queue', playerId)

const ids = (list) => (Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [])

function readAll(playerId) {
  return (playerId ? readJson('localStorage', keyFor(playerId)) : null) ?? {}
}

/** The current pass through `pool`, with ids no longer in the bank dropped. */
function passOf(all, laneId, topicId, pool) {
  const stored = all?.[laneId]?.[topicId] ?? {}
  const inPool = new Set(pool.map((item) => item.id))
  const solved = new Set(ids(stored.solved).filter((id) => inPool.has(id)))
  const deferred = ids(stored.deferred).filter((id) => inPool.has(id) && !solved.has(id))
  const complete = stored.complete === true

  if (pool.length > 0 && solved.size === pool.length) return { solved: new Set(), deferred: [], complete: true }
  return { solved, deferred, complete }
}

export function clearQueue(playerId) {
  if (playerId) removeKey('localStorage', keyFor(playerId))
}

/** Up to `n` items to ask next: unseen, then answered wrong, then mastered ones as review. */
export function nextItems(playerId, laneId, topicId, n, { exclude = new Set(), pool = topicItems(laneId, topicId) } = {}) {
  const { solved, deferred } = passOf(readAll(playerId), laneId, topicId, pool)
  const waiting = new Set(deferred)
  const byId = new Map(pool.map((item) => [item.id, item]))

  const unseen = pool.filter((item) => !solved.has(item.id) && !waiting.has(item.id))
  const wrong = deferred.map((id) => byId.get(id))
  const review = pool.filter((item) => solved.has(item.id))

  return [...unseen, ...wrong, ...review].filter((item) => !exclude.has(item.id)).slice(0, n)
}

export function recordResult(playerId, laneId, topicId, id, correct, pool = topicItems(laneId, topicId)) {
  if (!playerId) return

  const all = readAll(playerId)
  const { solved, deferred, complete } = passOf(all, laneId, topicId, pool)

  const stillDeferred = deferred.filter((other) => other !== id)
  if (correct) solved.add(id)
  else {
    solved.delete(id)
    stillDeferred.push(id)
  }

  // Normalise straight away, so mastering the last item marks the topic complete.
  const pass = passOf({ [laneId]: { [topicId]: { solved: [...solved], deferred: stillDeferred, complete } } }, laneId, topicId, pool)
  const lane = { ...(all[laneId] ?? {}), [topicId]: { solved: [...pass.solved], deferred: pass.deferred, complete: pass.complete } }
  writeJson('localStorage', keyFor(playerId), { ...all, [laneId]: lane })
}

export function topicProgress(playerId, laneId, topicId, pool = topicItems(laneId, topicId)) {
  const { solved, complete } = passOf(readAll(playerId), laneId, topicId, pool)
  return { done: complete ? pool.length : solved.size, required: pool.length, complete }
}

/** All of a lane's topics counted together, for the home screen. */
export function laneProgress(playerId, laneId) {
  const lane = LANES.find((l) => l.id === laneId)
  const topics = lane.topics.map((topic) => topicProgress(playerId, laneId, topic.id))
  return {
    done: topics.reduce((sum, t) => sum + t.done, 0),
    required: topics.reduce((sum, t) => sum + t.required, 0),
    complete: topics.length > 0 && topics.every((t) => t.complete),
  }
}
