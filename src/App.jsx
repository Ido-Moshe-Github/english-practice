import { useCallback, useEffect, useState } from 'react'
import Home from './components/Home.jsx'
import PlayerPicker from './components/PlayerPicker.jsx'
import Round from './components/Round.jsx'
import Settings from './components/Settings.jsx'
import Summary from './components/Summary.jsx'
import TopicPicker from './components/TopicPicker.jsx'
import { addPlayer, forgetPlayer, readPlayers, setActivePlayer } from './lib/players.js'
import { clearQueue, recordResult } from './lib/queue.js'
import { advance, answer, buildRound, isFinished, isRound, MIXED, scoreRound } from './lib/round.js'
import { DAILY_PLAN, isLastDailyStep } from './lib/daily.js'
import { clearState, readState, writeState } from './lib/session.js'
import { t } from './lib/strings.js'
import { laneById } from './lib/topics.js'

/**
 * Screen flow:
 *   players ──▶ home ──▶ topics ──▶ round ──▶ summary ──▶ (round again | home)
 *                  ├──▶ settings
 *                  └──▶ daily practice: round ──▶ summary ──▶ next round … ──▶ home
 *
 * The round in progress lives here, as plain data (see round.js), and is saved
 * to sessionStorage after every change, so a reload lands on the same turn.
 * Each item is recorded in the player's queue the moment its last turn is answered.
 */
export default function App() {
  const [players, setPlayers] = useState(readPlayers)
  const player = players.players.find((p) => p.id === players.active) ?? null
  const playerId = player?.id ?? null
  const [choosingPlayer, setChoosingPlayer] = useState(false)

  const [restored] = useState(() => {
    const saved = readState(playerId)
    const needsRound = saved?.screen === 'round' || saved?.screen === 'summary'
    return needsRound && !isRound(saved.round) ? null : saved
  })
  const [screen, setScreen] = useState(() => restored?.screen ?? 'home')
  const [laneId, setLaneId] = useState(() => restored?.laneId ?? null)
  const [round, setRound] = useState(() => restored?.round ?? null)
  /** The step of DAILY_PLAN being played, or null outside daily practice. */
  const [dailyStep, setDailyStep] = useState(() => (Number.isInteger(restored?.dailyStep) ? restored.dailyStep : null))

  useEffect(() => {
    if (!playerId) return
    if (screen === 'home') clearState(playerId)
    else writeState(playerId, { screen, laneId, round, dailyStep })
  }, [playerId, screen, laneId, round, dailyStep])

  const goHome = useCallback(() => {
    setRound(null)
    setDailyStep(null)
    setScreen('home')
  }, [])

  const switchTo = useCallback(
    (id) => {
      setPlayers(setActivePlayer(id))
      setChoosingPlayer(false)
      goHome()
    },
    [goHome]
  )

  const onAnswer = useCallback(
    (choice) => {
      const result = answer(round, choice)
      if (result.finished) {
        const { id, topic, correct } = result.finished
        recordResult(playerId, round.laneId, topic, id, correct)
      }
      setRound(result.round)
    },
    [round, playerId]
  )

  if (!player || choosingPlayer) {
    return (
      <div className="app">
        <PlayerPicker
          players={players.players}
          onChoose={switchTo}
          onAdd={(name) => {
            const added = addPlayer(name)
            setPlayers(readPlayers())
            if (added) switchTo(added.id)
          }}
          onBack={player && choosingPlayer ? () => setChoosingPlayer(false) : null}
        />
      </div>
    )
  }

  const start = (topicId) => {
    setRound(buildRound(playerId, laneId, topicId))
    setDailyStep(null)
    setScreen('round')
  }

  const startDaily = (step) => {
    const lane = DAILY_PLAN[step]
    setLaneId(lane)
    setRound(buildRound(playerId, lane, MIXED))
    setDailyStep(step)
    setScreen('round')
  }

  const inDaily = dailyStep !== null
  const dailyHeading = inDaily ? t.dailyStep(dailyStep + 1, DAILY_PLAN.length, laneById(DAILY_PLAN[dailyStep]).title) : undefined
  const dailyNext = inDaily
    ? isLastDailyStep(dailyStep)
      ? { label: t.finish, onClick: goHome }
      : { label: t.nextRound, onClick: () => startDaily(dailyStep + 1) }
    : undefined

  const onNext = () => {
    const next = advance(round)
    setRound(next)
    if (isFinished(next)) setScreen('summary')
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <Home
          player={player}
          onSwitchPlayer={() => setChoosingPlayer(true)}
          onSettings={() => setScreen('settings')}
          onDaily={() => startDaily(0)}
          onPick={(lane) => {
            setLaneId(lane)
            setScreen('topics')
          }}
        />
      )}

      {screen === 'settings' && (
        <Settings
          players={players.players}
          onReset={(id) => clearQueue(id)}
          onRemove={(id) => {
            setPlayers(forgetPlayer(id))
            if (id === playerId) goHome()
          }}
          onBack={goHome}
        />
      )}

      {screen === 'topics' && <TopicPicker playerId={playerId} laneId={laneId} onPick={start} onBack={goHome} />}

      {screen === 'round' && round && <Round round={round} heading={dailyHeading} onAnswer={onAnswer} onNext={onNext} onBack={goHome} />}

      {screen === 'summary' && round && (
        <Summary
          laneId={round.laneId}
          score={scoreRound(round)}
          heading={dailyHeading}
          title={inDaily && isLastDailyStep(dailyStep) ? t.dailyDone : undefined}
          next={dailyNext}
          onAgain={() => start(round.topicId)}
          onHome={goHome}
        />
      )}
    </div>
  )
}
