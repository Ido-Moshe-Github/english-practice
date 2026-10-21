/** All UI text lives here — change wording in one place. */
export const t = {
  appTitle: 'English of Fun',

  back: 'Back',
  next: 'Next',
  again: 'Play again',
  home: 'Home',

  pickTopic: 'What do you want to practise?',
  mixed: 'Mixed',
  mixedHint: 'A bit of everything',
  mastered: (done, total) => `${done} / ${total} mastered`,

  daily: 'Daily practice',
  dailyHint: (questions) => `${questions} questions from every section`,
  dailyStep: (step, total, lane) => `Daily ${step}/${total} · ${lane}`,
  nextRound: 'Next round →',
  finish: 'Finish',
  dailyDone: 'Daily practice done!',
  noItemsYet: 'No questions yet',

  questionCounter: (current, total) => `Question ${current} of ${total}`,
  conversationCounter: (current, total) => `Conversation ${current} of ${total}`,
  you: 'You',
  rightAnswer: 'Right answer',
  pressKeys: 'Tip: press 1–4 to answer, Enter for next',

  summaryTitle: 'Round complete!',
  summaryScore: (correct, total) => `${correct} / ${total}`,
  summaryConversations: (perfect, total) => `${perfect} of ${total} conversations with no mistakes`,
  summaryPicks: (right, total) => `${right} of ${total} replies right`,
  summaryQuestions: (right, total) => `${right} of ${total} questions right`,
  mistakesTitle: 'Worth another look',
  yourAnswer: 'You said',

  whoIsPlaying: "Who's practising?",
  addPlayer: 'New player',
  namePrompt: "What's your name?",
  namePlaceholder: 'My name',
  start: "Let's go!",
  cancel: 'Cancel',
  settings: 'Settings',
  settingsHint: 'Manage players',
  resetProgress: 'Reset progress',
  removePlayer: 'Delete player',
  confirmReset: (name) => `Reset all of ${name}'s progress?`,
  confirmRemove: (name) => `Delete ${name} and all their progress?`,
  cannotUndo: "This can't be undone",
  yes: 'Yes, reset',
  yesRemove: 'Yes, delete',
  no: 'Cancel',
  noPlayers: 'No players yet',

  errorTitle: 'Oops',
  errorEmptyRound: 'There are no questions here yet. Run npm run generate to create them.',
}

/** Shown after a right answer. */
export const PRAISE = ['Nice!', 'Spot on!', 'Exactly!', 'Great!', 'Perfect!', 'You got it!', 'Nailed it!']

/** Shown after a wrong answer — encouraging, never scolding. */
export const ENCOURAGEMENT = ['Not quite', 'Almost!', 'Close one', 'Good try']

/** Closing line on the summary screen, chosen by how well the round went. */
export function summaryMessage(ratio) {
  if (ratio === 1) return 'Perfect round!'
  if (ratio >= 0.8) return 'Really good work!'
  if (ratio >= 0.5) return 'Nice — keep it up!'
  return 'Every round helps. Try another one!'
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}
