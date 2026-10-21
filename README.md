# English of Fun

A small offline web app for practising real-life English. Made for Hebrew-speaking
teens and adults who already get by in English and want it to sound natural.

## Run it

**Download [`play.html`](play.html) and double-click it.** That's everything.

No install, no internet, no accounts — it's one self-contained file that opens in any
browser, on Windows or Mac. To give it to someone, send them that one file.

**Keep it somewhere permanent.** Progress is saved by the browser, not in a file, and
Firefox ties it to the file's exact location — move or rename `play.html` and that
player starts from scratch. Replacing it in place with a newer version is fine.

## What's in it

- **Everyday English** — short conversations of 2–3 turns: asking for directions,
  ordering food, shopping, hotels, small talk, appointments, work and school, asking
  for help. Each conversation mixes two kinds of turn: pick the reply that fits what
  they said (every option is fluent English — only one makes sense), or fill the gap
  in your own reply with the right word.
- **Phrasal verbs** — 23 verbs, from *get, look, take, put* to *hang, carry, sort out,
  figure out*: fill the gap, or pick what a phrasal verb means.
- **Tenses** — from present simple vs. continuous up to mixed conditionals and
  *wish / if only*.
- **Prepositions** — pick the preposition that fits the sentence: *in / on / at* for
  time and place, movement, *for / since / during*, and the ones that go with
  adjectives, verbs and nouns (*good at, depend on, reason for*).

Every question has four options, and after each answer a one-line explanation.
Rounds are 2 questions (or 2 conversations). Inside each topic you work through the
questions in order; anything you get wrong comes back later, and a counter shows how
many you've mastered. **Mixed** draws from every topic in the lane.

**Daily practice** runs one round of each section in a row (4 rounds of 2), always Mixed, so
every day brings questions you haven't seen yet. Settings (⚙️) shows how many daily practices each
player has finished.

**Several people** can share one copy, each with their own progress.

## Working on the app

```bash
npm start
```

Installs what's needed and opens http://localhost:5173.

| | |
| --- | --- |
| `npm test` | run the tests |
| `npm run bundle` | rebuild `play.html` |
| `npm run generate -- --lane tenses` | top every topic of a lane up to 30 questions |
| `npm run review -- --lane tenses --apply` | check a lane's English, fix or drop weak items |

The last two drive the local [Claude Code](https://claude.com/claude-code) CLI, so they
run on a Claude subscription rather than a paid API key. Every item must pass
`src/lib/validate.js` before it's kept: four distinct options, the answer among them,
a short explanation, no answer that gives itself away by length, and no blocked words.
The review pass then has a stronger model check that exactly one option is right and
that the English is natural.

Rubik font by Hubert & Fischer, [SIL Open Font License](https://openfontlicense.org/).
