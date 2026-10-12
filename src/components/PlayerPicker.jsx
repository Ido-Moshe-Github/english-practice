import { useState } from 'react'
import { MAX_NAME_LENGTH } from '../lib/players.js'
import { t } from '../lib/strings.js'

/** Choose who is playing, or add someone new. Shown when no player is active. */
export default function PlayerPicker({ players, onChoose, onAdd, onBack }) {
  const [adding, setAdding] = useState(players.length === 0)
  const [name, setName] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    onAdd(name)
    setName('')
    setAdding(false)
  }

  return (
    <div className="screen picker">
      {onBack && (
        <button className="back-button" onClick={onBack}>
          ← {t.back}
        </button>
      )}

      <div className="home-emoji" aria-hidden="true">💬</div>
      <h2 className="picker-title">{adding ? t.namePrompt : t.whoIsPlaying}</h2>

      {adding ? (
        <form className="name-form" onSubmit={submit}>
          <input
            className="name-input"
            autoFocus
            maxLength={MAX_NAME_LENGTH}
            placeholder={t.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="primary-button" type="submit" disabled={!name.trim()}>
            {t.start}
          </button>
          {players.length > 0 && (
            <button className="secondary-button" type="button" onClick={() => setAdding(false)}>
              {t.cancel}
            </button>
          )}
        </form>
      ) : (
        <div className="player-list">
          {players.map((player) => (
            <button key={player.id} className="player-card" onClick={() => onChoose(player.id)}>
              <span className="player-avatar" aria-hidden="true">🙂</span>
              <span className="player-name">{player.name}</span>
            </button>
          ))}

          <button className="player-card player-card--add" onClick={() => setAdding(true)}>
            <span className="player-avatar" aria-hidden="true">＋</span>
            <span className="player-name">{t.addPlayer}</span>
          </button>
        </div>
      )}
    </div>
  )
}
