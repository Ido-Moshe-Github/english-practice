import { useState } from 'react'
import { LANES } from '../lib/topics.js'
import { laneProgress } from '../lib/queue.js'
import { t } from '../lib/strings.js'

/**
 * Reached from the cog on the home header. Resetting and deleting live here
 * rather than beside the player list, so picking your name can't wipe a month
 * of progress with one mis-tap.
 */
export default function Settings({ players, onReset, onRemove, onBack }) {
  const [confirming, setConfirming] = useState(null) // { id, action }

  const close = () => setConfirming(null)

  return (
    <div className="screen settings">
      <button className="back-button" onClick={onBack}>
        ← {t.back}
      </button>

      <h2 className="picker-title">
        <span aria-hidden="true">⚙️</span> {t.settings}
      </h2>
      <p className="settings-hint">{t.settingsHint}</p>

      {players.length === 0 && <p className="status-text">{t.noPlayers}</p>}

      <div className="settings-list">
        {players.map((player) => {
          const summary = LANES.map((lane) => {
            const { done, required } = laneProgress(player.id, lane.id)
            return `${lane.title} ${done}/${required}`
          }).join(' · ')
          const active = confirming?.id === player.id

          return (
            <div key={player.id} className="settings-row">
              <div className="settings-row-head">
                <span className="settings-name">
                  <span aria-hidden="true">🙂</span> {player.name}
                </span>
                <span className="settings-summary">{summary}</span>
              </div>

              {active ? (
                <div className="settings-confirm">
                  <span className="settings-confirm-text">
                    {confirming.action === 'reset'
                      ? t.confirmReset(player.name)
                      : t.confirmRemove(player.name)}
                  </span>
                  <span className="settings-confirm-sub">{t.cannotUndo}</span>
                  <div className="settings-actions">
                    <button
                      className="danger-button"
                      onClick={() => {
                        confirming.action === 'reset' ? onReset(player.id) : onRemove(player.id)
                        close()
                      }}
                    >
                      {confirming.action === 'reset' ? t.yes : t.yesRemove}
                    </button>
                    <button className="secondary-button" onClick={close}>
                      {t.no}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-actions">
                  <button
                    className="settings-action"
                    onClick={() => setConfirming({ id: player.id, action: 'reset' })}
                  >
                    {t.resetProgress}
                  </button>
                  <button
                    className="settings-action settings-action--danger"
                    onClick={() => setConfirming({ id: player.id, action: 'remove' })}
                  >
                    {t.removePlayer}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
