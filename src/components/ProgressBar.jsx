/** A labelled progress bar, used for plan progress on cards and pickers. */
export default function ProgressBar({ done, required, label, complete }) {
  const percent = required > 0 ? Math.min(100, (done / required) * 100) : 0

  return (
    <div className={`plan-bar ${complete ? 'plan-bar--complete' : ''}`}>
      {label && <span className="plan-bar-label">{label}</span>}
      <div className="plan-bar-track">
        <div className="plan-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
