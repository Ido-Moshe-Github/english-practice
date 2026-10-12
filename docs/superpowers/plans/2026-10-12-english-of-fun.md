# English of Fun Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline, single-file English practice app with three lanes, 10-item rounds and per-player progress.

**Architecture:** Fork the structure of `../multiples-of-fun` (React + Vite, iife bundle inlined into `play.html`). Pure logic in `src/lib` (tested with vitest), thin React screens in `src/components`, JSON banks in `src/data` produced by Claude-CLI scripts.

**Tech Stack:** React 19, Vite 8, vitest 4, Node 20+, `claude` CLI.

**Spec:** `docs/superpowers/specs/2026-10-12-english-of-fun-design.md`

## Global Constraints

- All UI and content in English; LTR; no network at runtime.
- 4 options per question; round = 10 items; conversations 2–3 turns.
- Player names ≤ 12 chars; storage prefix `english-of-fun`.
- Content: common words, no sex/violence; validator rules exactly as in the spec.
- Bundle target es2017, iife, single file.

## Review Focus

- Bank items removed/regenerated while a player has stored progress → stale hashes ignored, counters stay ≤ total (test in Task 3).
- A topic with fewer than 10 items → round contains what exists, no crash or repeats (Task 4).
- Reload mid-conversation → resumes at the same turn with the same option order (Task 4 + session in Task 1).
- Mixed when some topics are empty or complete → still fills 10 from the rest (Task 4).
- Corrupted / foreign localStorage values → read as empty, never throw (Task 1, Task 3).

---

### Task 1: Scaffold + storage, session, players
**Files:** `package.json`, `vite.config.js`, `vite.bundle.config.js`, `index.html`, `start.*`, `src/main.jsx`, `src/lib/{storage,session,players}.js`, `scripts/{claudeCli,bundleSingleFile}.js`, `test/players.test.js`, `test/session.test.js`
**Produces:** `key(...parts)`, `readJson/writeJson/removeKey(kind,key)`, `readState/writeState/clearState(playerId)`, `readPlayers/addPlayer/setActivePlayer/renamePlayer/forgetPlayer/removePlayer`, `MAX_NAME_LENGTH`.
- [ ] Copy from reference, change prefix and Hebrew comments; `forgetPlayer` calls `clearQueue` (Task 3).
- [ ] Tests: add/switch/remove players, name cleaning, corrupted storage reads as empty, session merge/clear.
- [ ] `npm test` passes; commit.

### Task 2: Lanes and validator
**Files:** `src/lib/lanes.js`, `src/lib/validate.js`, `test/validate.test.js`
**Produces:** `LANES` (`[{ id, title, hint, icon, topics: [{id,label}] }]`), `laneById(id)`, `itemsFor(laneId, topicId?)`, `validateItem(laneId, item, existingIds?) -> {ok, item?, reason?}`, `itemId(item) -> string` (FNV-1a over the question text).
- [ ] Tests: each validator rule rejects; good single/conversation items pass; duplicates rejected.
- [ ] Commit.

### Task 3: Queue
**Files:** `src/lib/queue.js`, `test/queue.test.js`
**Produces:** `nextItems(playerId, laneId, topicId, n, {exclude, pool}) -> item[]`, `recordResult(playerId, laneId, topicId, item, correct, pool?)`, `topicProgress(playerId, laneId, topicId, pool?) -> {done, required, complete}`, `laneProgress(playerId, laneId)`, `clearQueue(playerId)`.
- [ ] Tests: bank order, wrong goes to back, complete & restart, stale hashes ignored, garbage storage.
- [ ] Commit.

### Task 4: Round
**Files:** `src/lib/round.js`, `test/round.test.js`
**Produces:** `ROUND_SIZE = 10`, `MIXED = 'mixed'`, `buildRound(playerId, laneId, topicId, rng?) -> round`, where `round = { laneId, topicId, items: [{ id, topic, kind:'single'|'conversation', ...question with shuffled options }], index, turn, answers: [] }`; `answerCurrent(round, choice) -> round`, `advance(round) -> round`, `currentStep(round)`, `scoreRound(round) -> { items, perfect, picks, rightPicks, mistakes[] }`, `isFinished(round)`.
- [ ] Tests: topic round, Mixed round across topics, short topic, shuffle keeps answer, conversation scoring.
- [ ] Commit.

### Task 5: Content generation (runs in background while UI is built)
**Files:** `scripts/generate.js`, `src/data/{everyday,phrasal,tenses}.json`
- [ ] Prompt per lane/topic; validate; merge; write after every batch.
- [ ] Run all three lanes in parallel to 30 per topic; commit data.

### Task 6: UI
**Files:** `src/App.jsx`, `src/styles.css`, `src/lib/strings.js`, `src/components/{PlayerPicker,Home,TopicPicker,Round,Options,Summary,Settings,ProgressBar}.jsx`
- [ ] Screens per spec; Round records results via `recordResult` when an item finishes and persists the round via `writeState`.
- [ ] Keyboard 1–4 and Enter. Verify in browser.
- [ ] Commit.

### Task 7: Review pass, bundle, README
**Files:** `scripts/review.js`, `README.md`, `play.html`
- [ ] Review all banks with opus, apply, backfill with generate.
- [ ] `npm run bundle`; open `play.html` from file://; commit.
