// Summarizes one event with its local time, availability, and current status.

function getAvailability(event) {
  const registeredCount = event.registered_count ?? 0
  const seatsLeft = event.seats_left ?? event.capacity - registeredCount

  if (seatsLeft <= 0) {
    return { className: 'status-label--danger', label: 'Full' }
  }
  if (seatsLeft <= 3) {
    return { className: 'status-label--warning', label: 'Few seats left' }
  }
  return { className: 'status-label--success', label: 'Open' }
}

export default function EventCard({ event, onOpen }) {
  const availability = getAvailability(event)
  const eventDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.event_date))

  return (
    <article className="event-card">
      <div className="event-card__topline">
        <span className={`status-label ${availability.className}`}>
          {availability.label}
        </span>
      </div>
      <h2>{event.title}</h2>
      <dl className="event-facts">
        <div>
          <dt>When</dt>
          <dd>{eventDate}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{event.location}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>
            {event.registered_count} of {event.capacity} seats taken
          </dd>
        </div>
      </dl>
      <button
        className="button button--secondary event-card__action"
        type="button"
        onClick={() => onOpen(event.id)}
      >
        View event details
      </button>
    </article>
  )
}
