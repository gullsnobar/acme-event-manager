// Provides accessible sign-in and account-creation forms on one tabbed screen.

import { useRef, useState } from 'react'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function FieldError({ children, id }) {
  return children ? (
    <p className="field-error" id={id}>
      {children}
    </p>
  ) : null
}

export default function AuthPage({ initialTab = 'signin', onBack, onSignIn, onSignUp }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    password: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const signInTabRef = useRef(null)
  const signUpTabRef = useRef(null)

  function selectTab(tab) {
    setActiveTab(tab)
    setError('')
    setFieldErrors({})
    setNotice('')
    setShowPassword(false)
  }

  function handleTabKeyDown(event) {
    const tabs = ['signin', 'signup']
    const currentIndex = tabs.indexOf(activeTab)
    let nextIndex

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }

    event.preventDefault()
    selectTab(tabs[nextIndex])
    const refs = [signInTabRef, signUpTabRef]
    refs[nextIndex].current?.focus()
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function validateForm() {
    const errors = {}

    if (activeTab === 'signup' && !form.fullName.trim()) {
      errors.fullName = 'Enter your full name.'
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid work email address.'
    }
    if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      if (activeTab === 'signin') {
        await onSignIn(form.email.trim(), form.password)
      } else {
        await onSignUp({
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        })
        setActiveTab('signin')
        setForm((current) => ({ ...current, password: '' }))
        setShowPassword(false)
        setNotice('Account created. Sign in with your new account.')
        signInTabRef.current?.focus()
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const passwordErrorId = fieldErrors.password ? 'auth-password-error' : undefined

  return (
    <main className="page-shell page-shell--narrow" id="main-content">
      <button className="text-button back-button" type="button" onClick={onBack}>
        Back to all events
      </button>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="page-heading page-heading--compact">
          <p className="eyebrow">Employee access</p>
          <h1 id="auth-title">Welcome to Acme Events</h1>
          <p>Sign in to create and manage company events.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Account options">
          <button
            aria-controls="signin-panel"
            aria-selected={activeTab === 'signin'}
            className="auth-tab"
            id="signin-tab"
            ref={signInTabRef}
            role="tab"
            tabIndex={activeTab === 'signin' ? 0 : -1}
            type="button"
            onClick={() => selectTab('signin')}
            onKeyDown={handleTabKeyDown}
          >
            Sign in
          </button>
          <button
            aria-controls="signup-panel"
            aria-selected={activeTab === 'signup'}
            className="auth-tab"
            id="signup-tab"
            ref={signUpTabRef}
            role="tab"
            tabIndex={activeTab === 'signup' ? 0 : -1}
            type="button"
            onClick={() => selectTab('signup')}
            onKeyDown={handleTabKeyDown}
          >
            Create account
          </button>
        </div>

        <div
          aria-labelledby={`${activeTab}-tab`}
          id={`${activeTab}-panel`}
          role="tabpanel"
        >
          <form className="stack-form" noValidate onSubmit={handleSubmit}>
            {activeTab === 'signup' ? (
              <div className="field">
                <label htmlFor="auth-full-name">Full name</label>
                <input
                  aria-describedby={fieldErrors.fullName ? 'auth-name-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  autoComplete="name"
                  id="auth-full-name"
                  maxLength={120}
                  name="fullName"
                  required
                  type="text"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                />
                <FieldError id="auth-name-error">{fieldErrors.fullName}</FieldError>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="auth-email">Work email</label>
              <input
                aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                id="auth-email"
                name="email"
                required
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
              <FieldError id="auth-email-error">{fieldErrors.email}</FieldError>
            </div>

            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <div className="password-field">
                <input
                  aria-describedby={passwordErrorId}
                  aria-invalid={Boolean(fieldErrors.password)}
                  autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                  id="auth-password"
                  maxLength={128}
                  minLength={8}
                  name="password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
                <button
                  aria-controls="auth-password"
                  aria-pressed={showPassword}
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <FieldError id="auth-password-error">{fieldErrors.password}</FieldError>
            </div>

            {notice ? <p className="form-notice form-notice--success">{notice}</p> : null}
            {error ? <p className="form-notice form-notice--error" role="alert">{error}</p> : null}

            <button className="button button--primary button--full" disabled={isSaving} type="submit">
              {isSaving
                ? 'Please wait'
                : activeTab === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
