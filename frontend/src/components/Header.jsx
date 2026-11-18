// Displays the app identity and the actions available for the current session.

export default function Header({
  isCheckingSession,
  onCreateEvent,
  onGoHome,
  onSignIn,
  onSignOut,
  user,
}) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <button className="brand-button" type="button" onClick={onGoHome}>
          Acme Events
        </button>

        <nav className="header-actions" aria-label="Account and event actions">
          {isCheckingSession ? (
            <span className="header-status" role="status">
              Checking sign-in
            </span>
          ) : user ? (
            <>
              <span className="header-user">{user.full_name}</span>
              <button
                className="button button--primary"
                type="button"
                onClick={onCreateEvent}
              >
                New event
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={onSignOut}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="button button--primary"
              type="button"
              onClick={onSignIn}
            >
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
