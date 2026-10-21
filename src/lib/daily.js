import { LANES } from './topics.js'

/**
 * Daily practice: a fixed run of rounds, one from each lane in order. Each
 * round is a Mixed round, and the queue serves unseen questions first, so
 * every round brings questions the player hasn't met yet.
 */
export const ROUNDS_PER_LANE = 1

export const DAILY_PLAN = LANES.flatMap((lane) => Array(ROUNDS_PER_LANE).fill(lane.id))

export const isLastDailyStep = (step) => step === DAILY_PLAN.length - 1
