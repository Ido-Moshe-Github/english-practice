import { useEffect } from 'react'

/**
 * The four answers. Before a pick they're buttons (or keys 1-4); after it, the
 * right one turns green and a wrong pick turns red.
 */
export default function Options({ options, answer, picked, onPick }) {
  const answered = picked != null

  useEffect(() => {
    if (answered) return
    const onKey = (event) => {
      const index = Number(event.key) - 1
      if (Number.isInteger(index) && index >= 0 && index < options.length) onPick(options[index])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, options, onPick])

  return (
    <div className="options">
      {options.map((option, index) => {
        const state = !answered ? '' : option === answer ? 'option--right' : option === picked ? 'option--wrong' : 'option--dim'
        return (
          <button key={option} className={`option ${state}`} onClick={() => onPick(option)} disabled={answered}>
            <span className="option-key" aria-hidden="true">{index + 1}</span>
            <span className="option-text">{option}</span>
          </button>
        )
      })}
    </div>
  )
}
