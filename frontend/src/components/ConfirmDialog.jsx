// Presents an accessible confirmation step for destructive actions.

import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  confirmLabel,
  description,
  isBusy = false,
  isOpen,
  onClose,
  onConfirm,
  title,
}) {
  const cancelButtonRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (isOpen && !dialog.open) {
      dialog.showModal()
      cancelButtonRef.current?.focus()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  function handleCancel(event) {
    event.preventDefault()
    if (!isBusy) {
      onClose()
    }
  }

  return (
    <dialog
      aria-describedby="confirm-dialog-description"
      aria-labelledby="confirm-dialog-title"
      className="confirm-dialog"
      onCancel={handleCancel}
      ref={dialogRef}
    >
      <div className="confirm-dialog__content">
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="dialog-actions">
          <button
            className="button button--secondary"
            disabled={isBusy}
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
          >
            Keep it
          </button>
          <button
            className="button button--danger"
            disabled={isBusy}
            type="button"
            onClick={onConfirm}
          >
            {isBusy ? 'Please wait' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
