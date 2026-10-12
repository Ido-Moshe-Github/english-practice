import { laneById } from '../lib/topics.js'
import { summaryMessage, t } from '../lib/strings.js'

const STAR_COUNT = 3

/** 0-3 stars, so a perfect round is visibly different from a good one. */
function starsFor(ratio) {
  if (ratio === 1) return 3
  if (ratio >= 0.8) return 2
  if (ratio >= 0.5) return 1
  return 0
}

export default function Summary({ laneId, score, onAgain, onHome }) {
  const lane = laneById(laneId)
  const ratio = score.total ? score.perfect / score.total : 0
  const stars = starsFor(ratio)

  return (
    <div className="screen summary">
      <div className="summary-emoji" aria-hidden="true">{stars === 3 ? '🎉' : stars >= 1 ? '👏' : '💪'}</div>
      <h2>{t.summaryTitle}</h2>

      <div className="stars" aria-hidden="true">
        {Array.from({ length: STAR_COUNT }, (_, i) => (
          <span key={i} className={`star ${i < stars ? 'star--on' : ''}`}>★</span>
        ))}
      </div>

      <p className="summary-score">{t.summaryScore(score.perfect, score.total)}</p>
      <p className="summary-message">
        {lane.conversation
          ? `${t.summaryConversations(score.perfect, score.total)} · ${t.summaryPicks(score.rightPicks, score.picks)}`
          : t.summaryQuestions(score.perfect, score.total)}
      </p>
      <p className="summary-message">{summaryMessage(ratio)}</p>

      <div className="summary-actions">
        <button className="primary-button" onClick={onAgain} autoFocus>{t.again}</button>
        <button className="secondary-button" onClick={onHome}>{t.home}</button>
      </div>

      {score.mistakes.length > 0 && (
        <section className="mistakes">
          <h3>{t.mistakesTitle}</h3>
          {score.mistakes.map((mistake, index) => (
            <div key={index} className="mistake">
              {mistake.intro && mistake.intro !== score.mistakes[index - 1]?.intro && (
                <p className="mistake-intro">{mistake.intro}</p>
              )}
              <p className="mistake-line">{mistake.line.replace(/\*\*/g, '')}</p>
              <p className="mistake-wrong">✕ {t.yourAnswer}: {mistake.choice}</p>
              <p className="mistake-right">✓ {mistake.answer}</p>
              <p className="mistake-why">{mistake.why}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
