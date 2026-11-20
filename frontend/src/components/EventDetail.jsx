// Shows one event, its registration form, attendee list, and management actions.

import { useCallback, useEffect, useState } from 'react'
import {
  cancelRegistration,
  getEvent,
  listRegistrations,
  register,
} from '../api.js'
import ConfirmDialog from './ConfirmDialog.jsx'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGISTRATION_PAGE_SIZE = 100

async function getAllRegistrations(eventId) {
  const registrations = []
  let skip = 0

  // Fetch every API page so the attendee list is complete for larger events.
  while (true) {
    const page = await listRegistrations(eventId, {
      skip,
      limit: REGISTRATION_PAGE_SIZE,
    })
    registrations.push(...page)

    if (page.length < REGISTRATION_PAGE_SIZE) {
      return registrations
    }
    skip += REGISTRATION_PAGE_SIZE
  }
}

export default function EventDetail({
  eventId,
  onBack,
  onDelete,
  onEdit,
  onEventChanged,
  showToast,
  user,
}) {
  const [actionError, setActionError] = useState('')
  const [dialogAction, setDialogAction] = useState(null)
  const [error, setError] = useState('')
  const [event, setEvent] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({ email: '', name: '' })
  const [isConfirming, setIsConfirming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrations, setRegistrations] = useState([])
  const [registrationError, setRegistrationError] = useState('')
  const [registrationSuccess, setRegistrationSuccess] = useState('')

  const loadEvent = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true)
    }
    setError('')

    try {
      const [eventResult, registrationResult] = await Promise.all([
        getEvent(eventId),
        getAllRegistrations(eventId),
      ])
      setEvent(eventResult)
      setRegistrations(registrationResult)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (showLoadingState) {
        setIsLoading(false)
      }
    }
  }, [eventId])

  useEffect(() => {
    const timer = window.setTimeout(() => loadEvent(), 0)
    return () => window.clearTimeout(timer)
  }, [loadEvent])

  function updateRegistrationField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
    setRegistrationError('')
    setRegistrationSuccess('')
  }

  function validateRegistration() {
    const errors = {}

    if (!form.name.trim()) {
      errors.name = 'Enter your full name.'
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid work email address.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleRegistration(submitEvent) {
    submitEvent.preventDefault()
    setRegistrationError('')
    setRegistrationSuccess('')

    if (!validateRegistration()) {
      return
    }

    setIsRegistering(true)
    try {
      await register(eventId, {
        employee_name: form.name.trim(),
        employee_email: form.email.trim(),
      })
      setForm({ email: '', name: '' })
      setRegistrationSuccess('Registration confirmed. A seat has been reserved for you.')
      await loadEvent(false)
      onEventChanged()
    } catch (requestError) {
      setRegistrationError(requestError.message)
    } finally {
      setIsRegistering(false)
    }
  }

  async function handleConfirmedAction() {
    setIsConfirming(true)
    setActionError('')

    try {
      if (dialogAction.type === 'registration') {
        await cancelRegistration(dialogAction.registration.id)
        setDialogAction(null)
        showToast('Registration cancelled')
        await loadEvent(false)
        onEventChanged()
      } else {
        await onDelete(event.id)
      }
    } catch (requestError) {
      setActionError(requestError.message)
      setDialogAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <main className="page-shell" id="main-content">
        <div className="state-card" role="status">
          <h1>Loading event details</h1>
          <p>Please wait while the event is retrieved.</p>
        </div>
      </main>
    )
  }

  if (error || !event) {
    return (
      <main className="page-shell" id="main-content">
        <button className="text-button back-button" type="button" onClick={onBack}>
          Back to all events
        </button>
        <div className="state-card state-card--error" role="alert">
          <h1>Event details could not be loaded</h1>
          <p>{error || 'This event is no longer available.'}</p>
          <button className="button button--secondary" type="button" onClick={() => loadEvent()}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  const eventDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(event.event_date))
  const seatsLeft = event.seats_left ?? event.capacity - event.registered_count
  const isFull = seatsLeft <= 0
  const dialogIsForRegistration = dialogAction?.type === 'registration'

  return (
    <main className="page-shell" id="main-content">
      <button className="text-button back-button" type="button" onClick={onBack}>
        Back to all events
      </button>

      <article className="detail-card">
        <div className="detail-card__heading">
          <div>
            <p className="eyebrow">Event details</p>
            <h1>{event.title}</h1>
          </div>
          {user ? (
            <div className="management-actions">
              <button className="button button--secondary" type="button" onClick={() => onEdit(event)}>
                Edit event
              </button>
              <button
                className="button button--danger-outline"
                type="button"
                onClick={() => setDialogAction({ type: 'event' })}
              >
                Delete event
              </button>
            </div>
          ) : null}
        </div>

        <dl className="detail-facts">
          <div>
            <dt>Date and time</dt>
            <dd>{eventDate}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{event.location}</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>{event.registered_count} of {event.capacity} seats taken</dd>
          </div>
        </dl>

        <section className="event-description" aria-labelledby="event-description-title">
          <h2 id="event-description-title">About this event</h2>
          <p>{event.description}</p>
        </section>
      </article>

      <div className="detail-layout">
        <section className="content-card" aria-labelledby="registration-title">
          <h2 id="registration-title">Register for this event</h2>
          <p className="section-intro">
            {isFull
              ? 'This event is full. Check back later in case a seat becomes available.'
              : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} currently available.`}
          </p>

          <form className="stack-form" noValidate onSubmit={handleRegistration}>
            <div className="field">
              <label htmlFor="registration-name">Full name</label>
              <input
                aria-describedby={fieldErrors.name ? 'registration-name-error' : undefined}
                aria-invalid={Boolean(fieldErrors.name)}
                autoComplete="name"
                id="registration-name"
                maxLength={120}
                name="name"
                required
                type="text"
                value={form.name}
                onChange={(inputEvent) => updateRegistrationField('name', inputEvent.target.value)}
              />
              {fieldErrors.name ? <p className="field-error" id="registration-name-error">{fieldErrors.name}</p> : null}
            </div>

            <div className="field">
              <label htmlFor="registration-email">Work email</label>
              <input
                aria-describedby={fieldErrors.email ? 'registration-email-error' : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                id="registration-email"
                name="email"
                required
                type="email"
                value={form.email}
                onChange={(inputEvent) => updateRegistrationField('email', inputEvent.target.value)}
              />
              {fieldErrors.email ? <p className="field-error" id="registration-email-error">{fieldErrors.email}</p> : null}
            </div>

            {registrationSuccess ? (
              <p className="form-notice form-notice--success" role="status">{registrationSuccess}</p>
            ) : null}
            {registrationError ? (
              <p className="form-notice form-notice--error" role="alert">{registrationError}</p>
            ) : null}

            <button
              className="button button--primary button--full"
              disabled={isFull || isRegistering}
              type="submit"
            >
              {isRegistering ? 'Registering' : isFull ? 'Event is full' : 'Register for this event'}
            </button>
          </form>
        </section>

        <section className="content-card" aria-labelledby="attendees-title">
          <div className="section-heading-row">
            <div>
              <h2 id="attendees-title">Attendees</h2>
              <p className="section-intro">{registrations.length} registered</p>
            </div>
          </div>

          {actionError ? <p className="form-notice form-notice--error" role="alert">{actionError}</p> : null}

          {registrations.length === 0 ? (
            <div className="compact-empty-state">
              <p>No one has registered yet.</p>
            </div>
          ) : (
            <ul className="attendee-list">
              {registrations.map((registration) => (
                <li key={registration.id}>
                  <div>
                    <strong>{registration.employee_name}</strong>
                    <span>{registration.employee_email}</span>
                  </div>
                  <button
                    className="button button--quiet-danger"
                    type="button"
                    onClick={() => setDialogAction({
                      type: 'registration',
                      registration,
                    })}
                  >
                    Cancel registration
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        confirmLabel={dialogIsForRegistration ? 'Cancel registration' : 'Delete event'}
        description={dialogIsForRegistration
          ? `Cancel the registration for ${dialogAction.registration.employee_name}? Their seat will become available to someone else.`
          : 'Delete this event and all of its registrations? This cannot be undone.'}
        isBusy={isConfirming}
        isOpen={Boolean(dialogAction)}
        title={dialogIsForRegistration ? 'Cancel this registration?' : 'Delete this event?'}
        onClose={() => {
          if (!isConfirming) {
            setDialogAction(null)
          }
        }}
        onConfirm={handleConfirmedAction}
      />
    </main>
  )
}
