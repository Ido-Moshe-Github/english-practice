import { describe, expect, it } from 'vitest'
import { validateItem } from '../src/lib/validate.js'
import { itemId } from '../src/lib/items.js'

const single = () => ({
  topic: 'conditionals',
  context: 'Your friend missed a great concert.',
  prompt: 'If you ___ earlier, you would have got a ticket.',
  options: ['had come', 'came', 'would come', 'have come'],
  answer: 'had come',
  why: 'Third conditional: if + had + past participle, for a past that did not happen.',
})

const turn = (line) => ({
  kind: 'reply',
  line,
  options: ['Yes, how do I get to the station?', 'Yes, I already found the station.', 'No thanks, I live right here.', 'Sure, I can help you too.'],
  answer: 'Yes, how do I get to the station?',
  why: 'You are lost, so you ask the way.',
})

const gapTurn = (line) => ({
  kind: 'gap',
  line,
  reply: 'Great, so I ___ left at the lights?',
  options: ['turn', 'make', 'take on', 'do'],
  answer: 'turn',
  why: 'You "turn left" at a corner or the lights.',
})

const conversation = () => ({
  topic: 'directions',
  situation: 'You are lost in Rome.',
  turns: [turn('Local: Hi, can I help you?'), gapTurn('Local: Go straight, then left at the lights.')],
})

const reason = (lane, item, existing) => validateItem(lane, item, existing).reason

describe('validateItem: single questions', () => {
  it('accepts a good item and trims it', () => {
    const result = validateItem('tenses', { ...single(), prompt: '  If you ___ earlier, you would have got a ticket. ' })
    expect(result.ok).toBe(true)
    expect(result.item.prompt).toBe('If you ___ earlier, you would have got a ticket.')
  })

  it('allows the context to be left out', () => {
    const { context, ...rest } = single()
    expect(validateItem('tenses', rest).ok).toBe(true)
  })

  it('rejects an unknown lane or topic', () => {
    expect(reason('nope', single())).toMatch(/lane/)
    expect(reason('tenses', { ...single(), topic: 'directions' })).toMatch(/topic/)
  })

  it('rejects a missing prompt or why', () => {
    expect(reason('tenses', { ...single(), prompt: ' ' })).toMatch(/prompt/)
    expect(reason('tenses', { ...single(), why: '' })).toMatch(/why/)
  })

  it('needs exactly four distinct options', () => {
    expect(reason('tenses', { ...single(), options: ['had come', 'came', 'would come'] })).toMatch(/4 options/)
    expect(reason('tenses', { ...single(), options: ['had come', 'came', 'Came ', 'have come'] })).toMatch(/distinct/)
  })

  it('needs the answer among the options', () => {
    expect(reason('tenses', { ...single(), answer: 'has come' })).toMatch(/answer/)
  })

  it('rejects options that are too long', () => {
    const long = 'x'.repeat(121)
    expect(reason('tenses', { ...single(), options: [long, 'b', 'c', 'd'], answer: long })).toMatch(/long/)
  })

  it('rejects a why that is too short or too long', () => {
    expect(reason('tenses', { ...single(), why: 'Because.' })).toMatch(/why/)
    expect(reason('tenses', { ...single(), why: 'y'.repeat(201) })).toMatch(/why/)
  })

  it('rejects an answer that gives itself away by length', () => {
    const item = { ...single(), options: ['had come much earlier than that', 'came', 'went', 'ran'], answer: 'had come much earlier than that' }
    expect(reason('tenses', item)).toMatch(/length/)
  })

  it('rejects blocked words', () => {
    expect(reason('tenses', { ...single(), context: 'He wanted to kill the boss.' })).toMatch(/blocked/)
  })

  it('does not block innocent words that contain a blocked one', () => {
    expect(validateItem('tenses', { ...single(), context: 'She learned a new skill at work.' }).ok).toBe(true)
  })

  it('rejects a duplicate', () => {
    expect(reason('tenses', single(), new Set([itemId(single())]))).toMatch(/duplicate/)
  })
})

describe('validateItem: conversations', () => {
  it('accepts a good conversation', () => {
    expect(validateItem('everyday', conversation()).ok).toBe(true)
  })

  it('needs 2 or 3 turns', () => {
    const one = { ...conversation(), turns: [turn('Hi')] }
    const four = { ...conversation(), turns: [turn('a'), gapTurn('b'), turn('c'), gapTurn('d')] }
    expect(reason('everyday', one)).toMatch(/turns/)
    expect(reason('everyday', four)).toMatch(/turns/)
  })

  it('checks every turn', () => {
    const item = conversation()
    item.turns[1].answer = 'something'
    expect(reason('everyday', item)).toMatch(/turn 2.*answer/)
  })

  it('needs both a reply turn and a gap turn', () => {
    expect(reason('everyday', { ...conversation(), turns: [turn('a'), turn('b')] })).toMatch(/reply turn and one gap/)
  })

  it('needs a known kind on every turn', () => {
    const item = conversation()
    item.turns[0].kind = 'guess'
    expect(reason('everyday', item)).toMatch(/turn 1: kind/)
  })

  it('needs exactly one gap in a gap reply', () => {
    const item = conversation()
    item.turns[1].reply = 'Great, so I turn left?'
    expect(reason('everyday', item)).toMatch(/turn 2: gap reply/)
  })

  it('keeps gap options to a few words and replies short', () => {
    const gappy = conversation()
    gappy.turns[1].options[1] = 'go and then make a'
    expect(reason('everyday', gappy)).toMatch(/gap option longer/)

    const wordy = conversation()
    wordy.turns[0].options[1] = 'Yes, I already found the station and I am going there now ok'
    expect(reason('everyday', wordy)).toMatch(/reply longer/)
  })

  it('needs a situation', () => {
    expect(reason('everyday', { ...conversation(), situation: '' })).toMatch(/situation/)
  })

  it('rejects the wrong shape for the lane', () => {
    expect(reason('everyday', { ...single(), topic: 'directions' })).toMatch(/turns/)
  })
})
