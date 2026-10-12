/**
 * Every question is stored in one of two shapes (see the spec):
 *   single:       { topic, context?, prompt, options, answer, why }
 *   conversation: { topic, situation, turns: [{ line, options, answer, why }] }
 *
 * The app works with one shape only — a list of turns with an optional intro —
 * so a single question is just a conversation of one turn.
 */
export function isConversation(item) {
  return Array.isArray(item?.turns)
}

export function toTurns(item) {
  if (isConversation(item)) {
    return { intro: item.situation, turns: item.turns }
  }
  const { prompt, options, answer, why } = item
  return { intro: item.context ?? '', turns: [{ line: prompt, options, answer, why }] }
}

/** The text that makes an item what it is. Options are left out so a reworded distractor keeps progress. */
function identityText(item) {
  return isConversation(item)
    ? [item.situation, ...item.turns.map((turn) => turn.line)].join('\n')
    : [item.context ?? '', item.prompt].join('\n')
}

/** FNV-1a. A short id that stays the same as long as the question's text does. */
export function itemId(item) {
  const text = identityText(item).toLowerCase().replace(/\s+/g, ' ').trim()
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}
