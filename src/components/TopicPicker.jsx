import { laneById } from '../lib/topics.js'
import { laneProgress, topicProgress } from '../lib/queue.js'
import { MIXED } from '../lib/round.js'
import ProgressBar from './ProgressBar.jsx'
import { t } from '../lib/strings.js'

function TopicRow({ title, hint, progress, onPick }) {
  const empty = progress.required === 0
  return (
    <button className={`topic-row ${progress.complete ? 'topic-row--done' : ''}`} onClick={onPick} disabled={empty}>
      <span className="topic-title">
        {progress.complete && <span aria-hidden="true">🏆 </span>}
        {title}
      </span>
      {hint && <span className="topic-hint">{hint}</span>}
      {empty ? (
        <span className="topic-hint">{t.noItemsYet}</span>
      ) : (
        <ProgressBar
          done={progress.done}
          required={progress.required}
          complete={progress.complete}
          label={t.mastered(progress.done, progress.required)}
        />
      )}
    </button>
  )
}

export default function TopicPicker({ playerId, laneId, onPick, onBack }) {
  const lane = laneById(laneId)

  return (
    <div className="screen picker">
      <button className="back-button" onClick={onBack}>
        ← {t.back}
      </button>

      <h2 className="picker-title">
        <span aria-hidden="true">{lane.icon}</span> {lane.title}
      </h2>
      <p className="settings-hint">{t.pickTopic}</p>

      <div className="topic-list">
        <TopicRow
          title={t.mixed}
          hint={t.mixedHint}
          progress={laneProgress(playerId, laneId)}
          onPick={() => onPick(MIXED)}
        />
        {lane.topics.map((topic) => (
          <TopicRow
            key={topic.id}
            title={topic.label}
            progress={topicProgress(playerId, laneId, topic.id)}
            onPick={() => onPick(topic.id)}
          />
        ))}
      </div>
    </div>
  )
}
