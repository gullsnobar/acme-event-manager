// Coordinates session state and the app's simple screen-based navigation.

import { useCallback, useEffect, useState } from 'react'
import {
  createEvent,
  deleteEvent,
  getMe,
  signIn,
  signUp,
  updateEvent,
} from './api.js'
import AuthPage from './components/AuthPage.jsx'
import EventDetail from './components/EventDetail.jsx'
import EventForm from './components/EventForm.jsx'
import EventsPage from './components/EventsPage.jsx'
import Header from './components/Header.jsx'
import ToastRegion from './components/ToastRegion.jsx'

const TOKEN_STORAGE_KEY = 'acme_events_access_token'

export default function App() {
  const [authStartTab, setAuthStartTab] = useState('signin')
  const [editingEvent, setEditingEvent] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [toast, setToast] = useState('')
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY) || '',
  )
  const [user, setUser] = useState(null)
  const [view, setView] = useState('events')

  const showToast = useCallback((message) => {
    setToast(message)
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timer = window.setTimeout(() => setToast(''), 4_000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let isCurrent = true

    async function loadSession() {
      if (!token) {
        if (isCurrent) {
          setUser(null)
          setIsCheckingSession(false)
        }
        return
      }

      setIsCheckingSession(true)
      try {
        const currentUser = await getMe(token)
        if (isCurrent) {
          setUser(currentUser)
        }
      } catch {
        // Invalid saved sessions are cleared without interrupting the employee.
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        if (isCurrent) {
          setToken('')
          setUser(null)
        }
      } finally {
        if (isCurrent) {
          setIsCheckingSession(false)
        }
      }
    }

    loadSession()
    return () => {
      isCurrent = false
    }
  }, [token])

  function goHome() {
    setEditingEvent(null)
    setSelectedEventId(null)
    setView('events')
  }

  function openEvent(eventId) {
    setSelectedEventId(eventId)
    setView('detail')
  }

  function openSignIn() {
    setAuthStartTab('signin')
    setView('auth')
  }

  function openCreateEvent() {
    if (!user) {
      openSignIn()
      return
    }
    setEditingEvent(null)
    setView('event-form')
  }

  function openEditEvent(event) {
    setEditingEvent(event)
    setView('event-form')
  }

  async function handleSignIn(email, password) {
    const tokenResponse = await signIn(email, password)
    const currentUser = await getMe(tokenResponse.access_token)

    localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.access_token)
    setToken(tokenResponse.access_token)
    setUser(currentUser)
    setView('events')
  }

  async function handleSignUp(data) {
    await signUp(data)
    showToast('Account created')
  }

  function handleSignOut() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken('')
    setUser(null)
    goHome()
  }

  async function handleSaveEvent(data) {
    const savedEvent = editingEvent
      ? await updateEvent(editingEvent.id, data, token)
      : await createEvent(data, token)

    showToast(editingEvent ? 'Event updated' : 'Event created')
    setEditingEvent(null)
    setSelectedEventId(savedEvent.id)
    setRefreshKey((value) => value + 1)
    setView('detail')
  }

  async function handleDeleteEvent(eventId) {
    await deleteEvent(eventId, token)
    showToast('Event deleted')
    setRefreshKey((value) => value + 1)
    goHome()
  }

  let page

  if (view === 'auth') {
    page = (
      <AuthPage
        initialTab={authStartTab}
        key={authStartTab}
        onBack={goHome}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    )
  } else if (view === 'event-form') {
    page = (
      <EventForm
        event={editingEvent}
        key={editingEvent?.id ?? 'new-event'}
        onCancel={editingEvent ? () => openEvent(editingEvent.id) : goHome}
        onSave={handleSaveEvent}
      />
    )
  } else if (view === 'detail' && selectedEventId !== null) {
    page = (
      <EventDetail
        eventId={selectedEventId}
        onBack={goHome}
        onDelete={handleDeleteEvent}
        onEdit={openEditEvent}
        onEventChanged={() => setRefreshKey((value) => value + 1)}
        showToast={showToast}
        user={user}
      />
    )
  } else {
    page = (
      <EventsPage
        onOpenEvent={openEvent}
        refreshKey={refreshKey}
      />
    )
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header
        isCheckingSession={isCheckingSession}
        onCreateEvent={openCreateEvent}
        onGoHome={goHome}
        onSignIn={openSignIn}
        onSignOut={handleSignOut}
        user={user}
      />
      {page}
      <ToastRegion message={toast} onDismiss={() => setToast('')} />
    </>
  )
}
