import { LANES } from '../lib/topics.js'
import { laneProgress } from '../lib/queue.js'
import ProgressBar from './ProgressBar.jsx'
import { t } from '../lib/strings.js'

export default function Home({ player, onPick, onSwitchPlayer, onSettings }) {
  return (
    <div className="screen home">
      <header className="home-header">
        <button className="settings-cog" onClick={onSettings} aria-label={t.settings} title={t.settings}>
          ⚙️
        </button>
        <div className="home-emoji" aria-hidden="true">💬</div>
        <h1>{t.appTitle}</h1>
        <button className="player-chip" onClick={onSwitchPlayer}>
          <span aria-hidden="true">🙂</span> {player.name}
        </button>
      </header>

      <div className="mode-cards">
        {LANES.map((lane) => {
          const progress = laneProgress(player.id, lane.id)
          return (
            <button
              key={lane.id}
              className={`mode-card mode-card--${lane.id} ${progress.complete ? 'mode-card--done' : ''}`}
              onClick={() => onPick(lane.id)}
            >
              <span className="mode-icon" aria-hidden="true">{progress.complete ? '🏆' : lane.icon}</span>
              <span className="mode-title">{lane.title}</span>
              <span className="mode-hint">{lane.hint}</span>
              <ProgressBar
                done={progress.done}
                required={progress.required}
                complete={progress.complete}
                label={t.mastered(progress.done, progress.required)}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
