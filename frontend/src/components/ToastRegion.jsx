// Announces short success messages without interrupting the user's work.

export default function ToastRegion({ message, onDismiss }) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="toast-region"
      role="status"
    >
      {message ? (
        <div className="toast">
          <span>{message}</span>
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}
