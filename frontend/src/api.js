// Provides the browser-facing API calls used by the Acme Events interface.

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '')

function finishSentence(message) {
  const trimmedMessage = String(message).trim()

  if (!trimmedMessage) {
    return 'Something went wrong. Please try again.'
  }

  return /[.!?]$/.test(trimmedMessage)
    ? trimmedMessage
    : `${trimmedMessage}.`
}

function readableFieldName(location = []) {
  const fieldName = location.at(-1)

  if (typeof fieldName !== 'string' || fieldName === 'body') {
    return ''
  }

  return fieldName
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())
}

async function getErrorMessage(response) {
  let payload

  try {
    payload = await response.json()
  } catch {
    return 'The server could not complete that request. Please try again.'
  }

  if (typeof payload.detail === 'string') {
    return finishSentence(payload.detail)
  }

  if (Array.isArray(payload.detail) && payload.detail.length > 0) {
    const firstError = payload.detail[0]
    const fieldName = readableFieldName(firstError.loc)
    const message = String(firstError.msg || 'Please check this value.')
      .replace(/^Value error,\s*/i, '')
    const plainMessage = fieldName
      ? `${fieldName}: ${message}`
      : message

    return finishSentence(plainMessage)
  }

  return 'The server could not complete that request. Please try again.'
}

async function request(path, options = {}) {
  const {
    body,
    headers: suppliedHeaders,
    token,
    ...fetchOptions
  } = options
  const headers = new Headers(suppliedHeaders)
  let requestBody = body

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    typeof body !== 'string'
  ) {
    headers.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      body: requestBody,
      headers,
    })
  } catch {
    throw new Error('Could not reach the server. Please try again.')
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response))
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function listEvents({
  skip = 0,
  limit = 9,
  title = '',
  date = '',
} = {}) {
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  })

  if (title) {
    query.set('title', title)
  }
  if (date) {
    query.set('date', date)
  }

  return request(`/events?${query}`)
}

export function getEvent(eventId) {
  return request(`/events/${eventId}`)
}

export function createEvent(data, token) {
  return request('/events', { method: 'POST', body: data, token })
}

export function updateEvent(eventId, data, token) {
  return request(`/events/${eventId}`, {
    method: 'PUT',
    body: data,
    token,
  })
}

export function deleteEvent(eventId, token) {
  return request(`/events/${eventId}`, { method: 'DELETE', token })
}

export function listRegistrations(
  eventId,
  { skip = 0, limit = 100 } = {},
) {
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  })

  return request(`/events/${eventId}/registrations?${query}`)
}

export function register(eventId, data) {
  return request(`/events/${eventId}/registrations`, {
    method: 'POST',
    body: data,
  })
}

export function cancelRegistration(registrationId) {
  return request(`/registrations/${registrationId}`, { method: 'DELETE' })
}

export function signUp(data) {
  return request('/auth/register', { method: 'POST', body: data })
}

export function signIn(email, password) {
  const form = new URLSearchParams({
    grant_type: 'password',
    username: email,
    password,
  })

  return request('/auth/login', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export function getMe(token) {
  return request('/auth/me', { token })
}
