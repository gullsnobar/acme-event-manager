// Collects and validates the complete details for creating or editing an event.

import { useState } from 'react'

function toDateTimeLocal(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

function FieldMessage({ error, errorId, hint, hintId }) {
  return (
    <>
      <p className="field-hint" id={hintId}>{hint}</p>
      {error ? <p className="field-error" id={errorId}>{error}</p> : null}
    </>
  )
}

export default function EventForm({ event, onCancel, onSave }) {
  const isEditing = Boolean(event)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({
    capacity: event?.capacity ? String(event.capacity) : '',
    description: event?.description ?? '',
    eventDate: toDateTimeLocal(event?.event_date),
    location: event?.location ?? '',
    title: event?.title ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function validateForm() {
    const errors = {}
    const capacity = Number(form.capacity)
    const eventDate = new Date(form.eventDate)

    if (!form.title.trim()) {
      errors.title = 'Enter an event title.'
    }
    if (!form.description.trim()) {
      errors.description = 'Enter an event description.'
    }
    if (!form.eventDate || Number.isNaN(eventDate.getTime())) {
      errors.eventDate = 'Choose a valid date and time.'
    } else if (eventDate <= new Date()) {
      errors.eventDate = 'Choose a date and time in the future.'
    }
    if (!form.location.trim()) {
      errors.location = 'Enter a location.'
    }
    if (!Number.isInteger(capacity) || capacity < 1) {
      errors.capacity = 'Capacity must be a whole number greater than zero.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    // datetime-local represents local time, while the API accepts an ISO UTC value.
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      event_date: new Date(form.eventDate).toISOString(),
      location: form.location.trim(),
      capacity: Number(form.capacity),
    }

    setIsSaving(true)
    try {
      await onSave(payload)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page-shell page-shell--form" id="main-content">
      <button className="text-button back-button" type="button" onClick={onCancel}>
        Back to all events
      </button>

      <section className="form-card" aria-labelledby="event-form-title">
        <div className="page-heading page-heading--compact">
          <p className="eyebrow">Event management</p>
          <h1 id="event-form-title">{isEditing ? 'Edit event' : 'Create a new event'}</h1>
          <p>Provide the details employees need before they register.</p>
        </div>

        <form className="stack-form" noValidate onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="event-title">Title</label>
            <input
              aria-describedby="event-title-hint event-title-error"
              aria-invalid={Boolean(fieldErrors.title)}
              id="event-title"
              maxLength={200}
              name="title"
              required
              type="text"
              value={form.title}
              onChange={(inputEvent) => updateField('title', inputEvent.target.value)}
            />
            <FieldMessage
              error={fieldErrors.title}
              errorId="event-title-error"
              hint="Use a short, clear name employees will recognize."
              hintId="event-title-hint"
            />
          </div>

          <div className="field">
            <label htmlFor="event-description">Description</label>
            <textarea
              aria-describedby="event-description-hint event-description-error"
              aria-invalid={Boolean(fieldErrors.description)}
              id="event-description"
              maxLength={2000}
              name="description"
              required
              rows={6}
              value={form.description}
              onChange={(inputEvent) => updateField('description', inputEvent.target.value)}
            />
            <FieldMessage
              error={fieldErrors.description}
              errorId="event-description-error"
              hint="Explain the purpose, agenda, and anything attendees should bring."
              hintId="event-description-hint"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="event-date">Date and time</label>
              <input
                aria-describedby="event-date-hint event-date-error"
                aria-invalid={Boolean(fieldErrors.eventDate)}
                id="event-date"
                name="eventDate"
                required
                type="datetime-local"
                value={form.eventDate}
                onChange={(inputEvent) => updateField('eventDate', inputEvent.target.value)}
              />
              <FieldMessage
                error={fieldErrors.eventDate}
                errorId="event-date-error"
                hint="Enter the date and time in your local time zone."
                hintId="event-date-hint"
              />
            </div>

            <div className="field">
              <label htmlFor="event-capacity">Capacity</label>
              <input
                aria-describedby="event-capacity-hint event-capacity-error"
                aria-invalid={Boolean(fieldErrors.capacity)}
                id="event-capacity"
                min="1"
                name="capacity"
                required
                step="1"
                type="number"
                value={form.capacity}
                onChange={(inputEvent) => updateField('capacity', inputEvent.target.value)}
              />
              <FieldMessage
                error={fieldErrors.capacity}
                errorId="event-capacity-error"
                hint="Maximum number of employees who can attend."
                hintId="event-capacity-hint"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="event-location">Location</label>
            <input
              aria-describedby="event-location-hint event-location-error"
              aria-invalid={Boolean(fieldErrors.location)}
              id="event-location"
              maxLength={200}
              name="location"
              required
              type="text"
              value={form.location}
              onChange={(inputEvent) => updateField('location', inputEvent.target.value)}
            />
            <FieldMessage
              error={fieldErrors.location}
              errorId="event-location-error"
              hint="Use a room name, office address, or online meeting location."
              hintId="event-location-hint"
            />
          </div>

          {error ? <p className="form-notice form-notice--error" role="alert">{error}</p> : null}

          <div className="form-actions">
            <button className="button button--secondary" disabled={isSaving} type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="button button--primary" disabled={isSaving} type="submit">
              {isSaving ? 'Saving event' : isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
