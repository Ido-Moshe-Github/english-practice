# English of Fun — design

An offline web app for practising real-life English, built the same way as
`../multiples-of-fun`: React + Vite, shipped as one self-contained `play.html`,
several players per copy, question banks generated ahead of time with the Claude CLI.

## Who it's for

Hebrew-speaking teens and adults who get by in English and want it to sound natural.
One difficulty level (adult). The whole app — UI, questions, explanations — is in
English. Explanations are one or two short, plain lines.

## Content rules

- Common, everyday words. No rare or bookish vocabulary.
- Casual speech and mild slang are fine.
- Nothing about sex or violence. No alcohol-centred situations.
- Every question has exactly one defensible right answer.
- Wrong options are typical learner mistakes (literal Hebrew translation, wrong tense,
  wrong particle, too blunt for the situation) — wrong, not merely less common.

## Lanes and topics

| Lane | id | Topics (id → label) |
| --- | --- | --- |
| Everyday English | `everyday` | `directions` Directions & transport · `food` Ordering food · `shopping` Shopping & returns · `travel` Hotel & travel · `smalltalk` Small talk · `appointments` Phone & appointments · `workschool` Work & school chat · `help` Asking for help & complaining politely |
| Phrasal verbs | `phrasal` | `get` · `look` · `take` · `put` · `turn` · `come` · `go` · `give-make-break` |
| Tenses | `tenses` | `present` Present simple vs. continuous · `perfect` Past simple vs. present perfect · `past` Past continuous & past perfect · `future` Future forms · `conditionals` Conditionals 1-2-3 · `mixed-wish` Mixed conditionals & wish / if only · `passive` Passive · `reported` Reported speech |

Each topic targets ~30 items, ~720 in all.

## Item shapes

Lane `phrasal` and `tenses` — a single question:

```json
{ "topic": "conditionals",
  "context": "Your friend missed a great concert.",
  "prompt": "If you ___ earlier, you would have got a ticket.",
  "options": ["had come", "came", "would come", "have come"],
  "answer": "had come",
  "why": "Third conditional: if + had + past participle, for a past that didn't happen." }
```

`context` is optional. `prompt` may contain `___` (fill the gap) or be a question
about meaning ("She **turned down** the job. What did she do?").

Lane `everyday` — a conversation of 2–3 turns:

```json
{ "topic": "directions",
  "situation": "You're in Rome and lost. You stop someone on the street.",
  "turns": [
    { "line": "Local: Hi, can I help you?",
      "options": ["...", "...", "...", "..."], "answer": "...", "why": "..." },
    { "line": "Local: Sure. Go straight, then take the second left.", "...": "..." }
  ] }
```

The conversation always continues from the right reply, even when the player chose
a wrong one.

An item's identity is a hash of its text (as in `wordProblems.js`), so progress
survives the bank being regenerated or reordered.

## Answering

Multiple choice only: 4 options, tap or press 1–4. Options are shuffled when the
round is built; the order is stored with the round so a resume shows the same order.

After every answer: the chosen option turns green or red, the right one is marked,
the `why` line appears, and a **Next** button (also Enter) moves on. Lane `everyday`
renders the conversation as a growing chat thread.

## Rounds and progress

- A round is 10 items: 10 single questions, or 10 conversations (~25 picks).
- Each topic is a queue per player, as with the maths word problems: first unseen
  items in bank order, then the ones answered wrong. A correct item is cleared; a
  wrong one goes to the back. A conversation is cleared only if every turn is right.
- When a topic is fully cleared it is marked complete and the queue starts over.
- **Mixed** builds a round by cycling through the lane's topics, taking the next
  queued item from each.
- Answers are recorded as each item finishes, so leaving mid-round loses nothing.
- Counters: mastered/total per topic, and per lane on the home screen.

## Screens

Players → Home (3 lane cards) → Topic picker (topics + Mixed) → Round → Summary →
(Play again | Home). Plus Settings from a cog on Home.

- **Players:** add, switch; names up to 12 characters; stored in localStorage.
- **Settings:** per player, reset progress or delete the player (with confirm).
  Deleting removes all of that player's stored data.
- **Summary:** score (lane 1: perfect conversations of 10, and right replies of
  total picks), then a list of mistakes with the right answer.
- **Resume:** the round in progress is kept in sessionStorage per player, so a
  reload continues it.

Not included: sound/speech, timers, accounts, sync, difficulty levels.

## Code layout

Copied from `multiples-of-fun` and adapted:

- `src/lib/storage.js`, `session.js`, `players.js` — as in the reference (new prefix).
- `src/lib/lanes.js` — lanes, topics, and the loaded banks.
- `src/lib/queue.js` — per-player, per-topic queue: next items, record result, progress.
- `src/lib/round.js` — build a round (topic or Mixed), shuffle options, score it.
- `src/lib/validate.js` — the mechanical item checks, shared by scripts and tests.
- `src/components/` — PlayerPicker, Home, TopicPicker, Round, QuestionView,
  ConversationView, Options, Summary, Settings, ProgressBar.
- `src/data/everyday.json`, `phrasal.json`, `tenses.json`.
- `scripts/generate.js`, `scripts/review.js`, `scripts/claudeCli.js`,
  `scripts/bundleSingleFile.js`.

## Content pipeline

`npm run generate -- --lane tenses [--topic conditionals] [--count 30]` tops up each
topic to the target count via `claude -p` (sonnet). Each item must pass
`validate.js` before it's kept:

- known topic; required fields present and non-empty
- exactly 4 options, distinct (case- and space-insensitive), each ≤ 120 chars
- `answer` is one of the options
- `why` 10–200 chars
- the answer is not the giveaway by length (≤ 1.5× the longest wrong option)
- conversations: 2–3 turns, each turn passing the option checks
- no word from a small blocklist (sex/violence terms)
- not a duplicate of an item already in the bank

`npm run review -- --lane tenses [--apply]` sends items in small chunks to a stronger
model (opus), which flags: more than one defensible answer, a wrong option that is
actually fine, unnatural or dated English, rare words, unsuitable topics. Flagged
items are rewritten (if the rewrite passes `validate.js`) or dropped; `generate`
backfills.

## Testing

vitest, node environment: players, queue (order, defer, complete & restart),
round building (topic and Mixed, shuffle keeps the answer, scoring of conversations),
session resume, `validate.js` cases, and a test that runs `validate.js` over every
bundled item.
