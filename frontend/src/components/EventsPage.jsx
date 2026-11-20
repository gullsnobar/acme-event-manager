// Lists searchable events and controls the nine-item result pages.

import { useEffect, useState } from 'react'
import { listEvents } from '../api.js'
import EventCard from './EventCard.jsx'

const PAGE_SIZE = 9

export default function EventsPage({ onOpenEvent, refreshKey }) {
  const [dateInput, setDateInput] = useState('')
  const [error, setError] = useState('')
  const [events, setEvents] = useState([])
  const [filters, setFilters] = useState({ date: '', title: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [skip, setSkip] = useState(0)
  const [titleInput, setTitleInput] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadEvents() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listEvents({
          skip,
          limit: PAGE_SIZE,
          title: filters.title,
          date: filters.date,
        })
        if (isCurrent) {
          setEvents(result)
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message)
          setEvents([])
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    loadEvents()
    return () => {
      isCurrent = false
    }
  }, [filters, reloadKey, refreshKey, skip])

  function handleSearch(event) {
    event.preventDefault()
    setSkip(0)
    setFilters({ date: dateInput, title: titleInput.trim() })
  }

  function handleClear() {
    setDateInput('')
    setTitleInput('')
    setSkip(0)
    setFilters({ date: '', title: '' })
  }

  return (
    <main className="page-shell" id="main-content">
      <section className="page-heading" aria-labelledby="events-title">
        <p className="eyebrow">Company events</p>
        <h1 id="events-title">Find an event</h1>
        <p>Browse upcoming events and reserve a place that works for you.</p>
      </section>

      <form className="search-panel" onSubmit={handleSearch}>
        <div className="field search-panel__title">
          <label htmlFor="event-search-title">Search by title</label>
          <input
            id="event-search-title"
            name="title"
            onChange={(event) => setTitleInput(event.target.value)}
            placeholder="For example, planning workshop"
            type="search"
            value={titleInput}
          />
        </div>
        <div className="field search-panel__date">
          <label htmlFor="event-search-date">Event date</label>
          <input
            id="event-search-date"
            name="date"
            onChange={(event) => setDateInput(event.target.value)}
            type="date"
            value={dateInput}
          />
        </div>
        <div className="search-panel__actions">
          <button className="button button--primary" type="submit">
            Search events
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="state-card" role="status">
          <h2>Loading events</h2>
          <p>Please wait while the latest events are retrieved.</p>
        </div>
      ) : error ? (
        <div className="state-card state-card--error" role="alert">
          <h2>Events could not be loaded</h2>
          <p>{error}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="state-card">
          <h2>No events found.</h2>
          <p>Try a different search.</p>
        </div>
      ) : (
        <section aria-label="Event results">
          <p className="results-summary" aria-live="polite">
            Showing {events.length} event{events.length === 1 ? '' : 's'}
          </p>
          <div className="event-grid">
            {events.map((event) => (
              <EventCard
                event={event}
                key={event.id}
                onOpen={onOpenEvent}
              />
            ))}
          </div>
        </section>
      )}

      <nav className="pagination" aria-label="Event pages">
        <button
          className="button button--secondary"
          disabled={isLoading || skip === 0}
          type="button"
          onClick={() => setSkip((value) => Math.max(0, value - PAGE_SIZE))}
        >
          Previous
        </button>
        <span>Page {Math.floor(skip / PAGE_SIZE) + 1}</span>
        <button
          className="button button--secondary"
          disabled={isLoading || events.length < PAGE_SIZE}
          type="button"
          onClick={() => setSkip((value) => value + PAGE_SIZE)}
        >
          Next
        </button>
      </nav>
    </main>
  )
}
