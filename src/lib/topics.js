/**
 * The lanes and their topics. Plain data with no imports, so the
 * content scripts (plain Node) can share it with the app.
 */
export const LANES = [
  {
    id: 'everyday',
    title: 'Everyday English',
    hint: 'Short real-life conversations',
    icon: '💬',
    conversation: true,
    topics: [
      { id: 'directions', label: 'Directions & transport' },
      { id: 'food', label: 'Ordering food' },
      { id: 'shopping', label: 'Shopping & returns' },
      { id: 'travel', label: 'Hotel & travel' },
      { id: 'smalltalk', label: 'Small talk' },
      { id: 'appointments', label: 'Phone & appointments' },
      { id: 'workschool', label: 'Work & school chat' },
      { id: 'help', label: 'Asking for help & complaining politely' },
    ],
  },
  {
    id: 'phrasal',
    title: 'Phrasal verbs',
    hint: 'Get up, get over, get along…',
    icon: '🧩',
    conversation: false,
    topics: [
      { id: 'get', label: 'get' },
      { id: 'look', label: 'look' },
      { id: 'take', label: 'take' },
      { id: 'put', label: 'put' },
      { id: 'turn', label: 'turn' },
      { id: 'come', label: 'come' },
      { id: 'go', label: 'go' },
      { id: 'give-make-break', label: 'give, make & break' },
      { id: 'run', label: 'run' },
      { id: 'bring', label: 'bring' },
      { id: 'set', label: 'set' },
      { id: 'pick', label: 'pick' },
      { id: 'call', label: 'call' },
      { id: 'work', label: 'work' },
      { id: 'keep', label: 'keep' },
      { id: 'hold', label: 'hold' },
      { id: 'cut', label: 'cut' },
      { id: 'fall', label: 'fall' },
      { id: 'carry', label: 'carry' },
      { id: 'check', label: 'check' },
      { id: 'hang', label: 'hang' },
      { id: 'show', label: 'show' },
      { id: 'sort-figure', label: 'sort & figure' },
    ],
  },
  {
    id: 'tenses',
    title: 'Tenses',
    hint: 'If I had known, I would have…',
    icon: '⏳',
    conversation: false,
    topics: [
      { id: 'present', label: 'Present simple vs. continuous' },
      { id: 'perfect', label: 'Past simple vs. present perfect' },
      { id: 'past', label: 'Past continuous & past perfect' },
      { id: 'future', label: 'Future: will, going to, -ing' },
      { id: 'conditionals', label: 'Conditionals 1, 2 & 3' },
      { id: 'mixed-wish', label: 'Mixed conditionals & wish' },
      { id: 'passive', label: 'Passive' },
      { id: 'reported', label: 'Reported speech' },
    ],
  },
  {
    id: 'prepositions',
    title: 'Prepositions',
    hint: 'In, on, at, for, since…',
    icon: '📍',
    conversation: false,
    topics: [
      { id: 'time', label: 'Time: in, on, at' },
      { id: 'place', label: 'Place: in, on, at' },
      { id: 'movement', label: 'Movement: to, into, through…' },
      { id: 'duration', label: 'For, since, during, by, until' },
      { id: 'adjectives', label: 'Adjective + preposition' },
      { id: 'verbs', label: 'Verb + preposition' },
      { id: 'nouns', label: 'Noun + preposition' },
      { id: 'phrases', label: 'Fixed phrases: on time, by car…' },
    ],
  },
]

export function laneById(laneId) {
  return LANES.find((lane) => lane.id === laneId) ?? null
}

export function topicById(laneId, topicId) {
  return laneById(laneId)?.topics.find((topic) => topic.id === topicId) ?? null
}
