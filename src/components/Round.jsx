import { useEffect, useMemo } from 'react'
import Options from './Options.jsx'
import RichText, { fillGap, splitSpeaker } from './RichText.jsx'
import { currentTurn } from '../lib/round.js'
import { laneById } from '../lib/topics.js'
import { ENCOURAGEMENT, PRAISE, pick, t } from '../lib/strings.js'

function Bubble({ who, children, tone = '' }) {
  return <div className={`bubble bubble--${who} ${tone}`}>{children}</div>
}

function TheirLine({ line }) {
  const { speaker, words } = splitSpeaker(line)
  return (
    <Bubble who="them">
      {speaker && <span className="bubble-speaker">{speaker}</span>}
      <RichText text={words} />
    </Bubble>
  )
}

function MyLine({ text, missed = false }) {
  return (
    <Bubble who="me" tone={missed ? 'bubble--missed' : ''}>
      <span className="bubble-speaker">{t.you}</span>
      <RichText text={text} />
    </Bubble>
  )
}

/** What you end up saying on a turn: the right reply, or your reply with the right word in the gap. */
const spokenReply = (turn) => (turn.kind === 'gap' ? fillGap(turn.reply, turn.answer) : turn.answer)

/** Earlier turns of the current conversation: their line, then the right reply. */
function History({ item, upTo, picks }) {
  return item.turns.slice(0, upTo).map((turn, index) => (
    <div key={index} className="chat-pair">
      <TheirLine line={turn.line} />
      <MyLine text={spokenReply(turn)} missed={picks.some((p) => p.turn === index && !p.correct)} />
    </div>
  ))
}

function Explanation({ correct, why, onNext }) {
  const message = useMemo(() => pick(correct ? PRAISE : ENCOURAGEMENT), [correct])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' || event.repeat) return
      event.preventDefault()
      onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNext])
  return (
    <div className={`feedback ${correct ? 'feedback--correct' : 'feedback--wrong'}`} role="status">
      <span className="feedback-text">
        <span aria-hidden="true">{correct ? '✓ ' : '✕ '}</span>
        {message}
      </span>
      <span className="feedback-why">{why}</span>
      <button className="primary-button" onClick={onNext}>
        {t.next} →
      </button>
    </div>
  )
}

export default function Round({ round, heading, onAnswer, onNext, onBack }) {
  const lane = laneById(round.laneId)
  const current = currentTurn(round)

  if (!current) {
    return (
      <div className="screen quiz">
        <button className="back-button" onClick={onBack}>← {t.back}</button>
        <div className="error-box">
          <h3>{t.errorTitle}</h3>
          <p>{t.errorEmptyRound}</p>
        </div>
      </div>
    )
  }

  const { item, turn, itemIndex, turnIndex, pick: answered } = current
  const itemPicks = round.picks.filter((p) => p.item === itemIndex)
  const counter = lane.conversation ? t.conversationCounter : t.questionCounter
  const percent = ((itemIndex + (answered ? 1 : 0) / item.turns.length) / round.items.length) * 100

  return (
    <div className="screen quiz">
      <div className="quiz-top">
        <button className="back-button" onClick={onBack}>← {t.back}</button>
        <span className="quiz-heading">{heading ?? lane.title}</span>
      </div>

      <div className="progress">
        <span className="progress-label">{counter(itemIndex + 1, round.items.length)}</span>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="question">
        {item.intro && <p className="intro">{item.intro}</p>}

        {lane.conversation ? (
          <div className="chat">
            <History item={item} upTo={turnIndex} picks={itemPicks} />
            <TheirLine line={turn.line} />
            {turn.kind === 'gap' && (
              <MyLine text={answered ? spokenReply(turn) : turn.reply} missed={answered && !answered.correct} />
            )}
          </div>
        ) : (
          <p className="prompt">
            <RichText text={turn.line} />
          </p>
        )}
      </div>

      <Options
        key={`options-${itemIndex}-${turnIndex}`}
        options={turn.options}
        answer={turn.answer}
        picked={answered?.choice}
        onPick={onAnswer}
      />

      {answered ? (
        <Explanation key={`why-${itemIndex}-${turnIndex}`} correct={answered.correct} why={turn.why} onNext={onNext} />
      ) : (
        <p className="key-tip">{t.pressKeys}</p>
      )}
    </div>
  )
}
