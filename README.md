# Acme Event Manager

Acme Event Manager is an internal event management system for Acme Corp employees. It provides a REST API and a browser interface for finding events, managing event details, registering attendees, and tracking available seats. Employees can browse and register without an account, while authenticated users can create, update, and delete events.

## Features

### Mandatory

- Create, read, fully update, and delete events.
- Register employees for events and list or cancel registrations.
- Enforce three registration rules: the event must exist, an email can register only once per event, and the event must have an available seat.
- Validate required fields, email addresses, string lengths, capacity, passwords, and future event dates.
- Return clear validation, authentication, not-found, and conflict responses.
- Generate interactive OpenAPI documentation through FastAPI at `/docs`.

### Bonus implemented

- Paginate event and registration lists with `skip` and `limit` parameters.
- Search event titles without case sensitivity and filter events by UTC calendar date.
- Register accounts and protect event changes with JWT bearer authentication.
- Perform database work asynchronously with SQLAlchemy and asyncpg.
- Exercise authentication, events, and registrations with 29 pytest tests.
- Provide a responsive React frontend for browsing, registration, authentication, and event management.

## Tech stack

| Area | Technology |
| --- | --- |
| Backend | Python 3.14, FastAPI, Pydantic v2, pydantic-settings, PyJWT, pwdlib |
| Database | PostgreSQL 18, SQLAlchemy 2.x async ORM, asyncpg |
| Frontend | React 19, Vite 8, JavaScript, plain CSS |
| Testing | pytest, pytest-asyncio, HTTPX with ASGITransport |

## Project structure

- `backend/`
  - `app/`
    - `auth.py`
    - `db.py`
    - `main.py`
    - `models.py`
    - `schemas.py`
    - `services.py`
  - `tests/`
    - `conftest.py`
    - `test_auth.py`
    - `test_events.py`
    - `test_registrations.py`
  - `.env.example`
  - `pytest.ini`
  - `requirements.txt`
- `frontend/`
  - `src/`
    - `components/`
    - `api.js`
    - `App.jsx`
    - `main.jsx`
    - `styles.css`
  - `package.json`
  - `vite.config.js`
- `ai-usage/`
  - `README.md`
- `AGENTS.md`
- `README.md`

The backend modules have focused responsibilities:

- `db.py` loads settings, creates the async engine and session factory, defines the declarative base, and provides the database dependency.
- `models.py` defines the `User`, `Event`, and `Registration` SQLAlchemy models.
- `schemas.py` validates request data and serializes API responses with Pydantic.
- `services.py` contains business rules, SQLAlchemy queries, commits, and domain exceptions.
- `main.py` creates the FastAPI application, configures CORS and startup behavior, maps domain exceptions to HTTP responses, and defines the routes.
- `auth.py` hashes and verifies passwords, creates JWT access tokens, and resolves the current authenticated user.

## How it works

An HTTP request first reaches a route in `main.py`. The route uses Pydantic schemas to validate input, receives an `AsyncSession` through FastAPI dependency injection, and calls the appropriate function in `services.py`. The service applies business rules, executes an async SQLAlchemy query or database change, and returns a model or raises a domain exception.

Business logic lives in `services.py` so routes remain small and focused on HTTP concerns. The service layer does not know about HTTP status codes: it raises `NotFoundError` or `ConflictError`, and the exception handlers in `main.py` translate those errors into HTTP 404 or 409 responses.

## Data model

### Users

The `users` table stores `id`, unique indexed `email`, `full_name`, `hashed_password`, and `created_at`. Email addresses are normalized to lowercase before storage. Users authenticate event-management requests, but events do not store an owner or user foreign key.

### Events

The `events` table stores `id`, `title`, `description`, indexed `event_date`, `location`, `capacity`, and `created_at`. A database check constraint requires capacity to be greater than zero. API responses also include a calculated registration count and the number of seats left.

### Registrations

The `registrations` table stores `id`, indexed `event_id`, `employee_name`, `employee_email`, and `registered_at`. Each registration belongs to one event through `event_id`, so one event can have many registrations. A unique constraint on `event_id` and `employee_email` prevents the same normalized email from registering twice for one event. The foreign key uses `ON DELETE CASCADE`, so deleting an event also deletes its registrations.

## Business rules and validation

- Event title, description, and location are required and have maximum lengths of 200, 2,000, and 200 characters respectively.
- Event capacity must be a whole number greater than zero.
- Event dates must be in the future when an event is created or updated. A date without timezone information is treated as UTC.
- Updating an event requires every editable event field because the API uses full `PUT` replacement semantics.
- Capacity cannot be reduced below the event's current registration count.
- Registration names are required and limited to 120 characters; registration emails must be valid.
- Registration and account emails are stored in lowercase, making duplicate checks case-insensitive.
- An employee email can register only once for the same event.
- Registration is rejected when the event is full. The event row is locked while capacity is checked to protect the last available seat from concurrent requests.
- Account passwords must contain between 8 and 128 characters.
- Event and registration pagination accepts `skip` values of zero or more and `limit` values from 1 to 100.

## API reference

### Auth

| Method | Path | Description | Login required |
| --- | --- | --- | --- |
| POST | `/auth/register` | Create an employee account. | No |
| POST | `/auth/login` | Exchange form-encoded email and password credentials for a JWT. The email is sent in the `username` field. | No |
| GET | `/auth/me` | Return the account represented by the bearer token. | Yes |

### Events

| Method | Path | Description | Login required |
| --- | --- | --- | --- |
| POST | `/events` | Create an event. | Yes |
| GET | `/events` | List events with optional pagination, title search, and date filtering. | No |
| GET | `/events/{event_id}` | Get one event. | No |
| PUT | `/events/{event_id}` | Replace all editable fields on an event. | Yes |
| DELETE | `/events/{event_id}` | Delete an event and its registrations. | Yes |

### Registrations

| Method | Path | Description | Login required |
| --- | --- | --- | --- |
| POST | `/events/{event_id}/registrations` | Register an employee for an event. | No |
| GET | `/events/{event_id}/registrations` | List registrations for an event with pagination. | No |
| DELETE | `/registrations/{registration_id}` | Cancel a registration. | No |

### Health

| Method | Path | Description | Login required |
| --- | --- | --- | --- |
| GET | `/health` | Run a simple query and report API and database availability. | No |

### Status codes

| Status | Meaning in this API |
| --- | --- |
| 200 | A read, login, health check, or event update succeeded. |
| 201 | An account, event, or registration was created. |
| 204 | An event or registration was deleted successfully, with no response body. |
| 401 | Login credentials are wrong, or a protected endpoint has a missing, invalid, expired, or unresolvable bearer token. |
| 404 | The requested event or registration does not exist. |
| 409 | An account or registration is duplicated, an event is full, or an update would reduce capacity below the registration count. |
| 422 | Request data or query parameters fail schema validation, including missing fields, invalid email addresses, non-positive capacity, or non-future event dates. |
| 503 | The health check cannot reach or query the database. |

## Getting started

### Prerequisites

Install these tools before starting:

- Python 3.14
- PostgreSQL 18
- Node.js LTS with npm
- Git

### Clone the repository

```powershell
git clone https://github.com/gullsnobar/acme-event-manager.git
Set-Location acme-event-manager
```

### Create the PostgreSQL user and databases

Open PostgreSQL's command-line client as an administrator:

```powershell
psql -U postgres
```

Run the following PostgreSQL commands. Replace the example password with a private password:

```sql
CREATE USER acme_events_user WITH PASSWORD 'replace_with_a_private_password';
CREATE DATABASE acme_events OWNER acme_events_user;
CREATE DATABASE acme_events_test OWNER acme_events_user;
\q
```

The test database is disposable. Never configure `TEST_DATABASE_URL` to use the real `acme_events` database because the test suite drops and recreates its tables.

### Configure and run the backend

From the repository root:

```powershell
Set-Location backend
py -3.14 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to the `acme_events` database, `TEST_DATABASE_URL` to `acme_events_test`, and `FRONTEND_ORIGIN` to the frontend address. Both database URLs must contain the PostgreSQL username and password.

Generate a private JWT secret:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the generated value into `JWT_SECRET_KEY` in `backend/.env`, then start the API:

```powershell
uvicorn app.main:app --reload
```

Open the interactive API documentation at http://127.0.0.1:8000/docs.

## Using the API in Swagger

1. Open http://127.0.0.1:8000/docs.
2. Expand `POST /auth/register`, select **Try it out**, provide a full name, email, and password, and execute the request.
3. Select the **Authorize** button at the top of the page.
4. Enter the registered email in the username field and enter the password. Swagger sends these form values to `/auth/login` and stores the returned bearer token for the session.
5. Call the protected create, update, and delete event endpoints. Public event and registration endpoints can be called without authorization.

## Frontend

Keep the backend running. In a second PowerShell window, run:

```powershell
Set-Location path\to\acme-event-manager\frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend uses `http://127.0.0.1:8000` as its default API base URL and can be pointed elsewhere with the Vite `VITE_API_URL` environment variable.

The interface supports account creation and sign-in, event search and date filtering, paginated event browsing, event details, public registration and cancellation, attendee lists, and authenticated event creation, editing, and deletion. Destructive actions use confirmation dialogs.

## Running the tests

The test suite requires `TEST_DATABASE_URL` to point to the separate `acme_events_test` PostgreSQL database. It skips all tests when this setting is absent. Before each test, the fixture drops and recreates every table in the test database, then overrides FastAPI's `get_db` dependency so API requests cannot use the application database.

With the backend virtual environment active, run from `backend/`:

```powershell
pytest -v
```

The suite contains 29 tests across three areas:

- Authentication: account creation, duplicate accounts, failed login, and authenticated or unauthenticated `/auth/me` access.
- Events: authenticated creation, validation, listing, lookup, full updates, deletion, pagination, title search, and date filtering.
- Registrations: creation, case-insensitive duplicates, capacity limits, validation, listing, cancellation, capacity-update conflicts, and cascade deletion.

## Design decisions and assumptions

- An email address identifies an employee for account and registration duplicate checks.
- Email normalization makes duplicate checks case-insensitive.
- Event dates must be in the future when created or updated.
- `PUT` performs a full update, so clients send all editable event fields.
- Event capacity cannot be reduced below the number of current registrations.
- Deleting an event deletes its registrations through the database foreign-key cascade.
- Viewing events, listing registrations, registering, and cancelling registrations are public. Creating, updating, and deleting events require login.
- Database tables are created at application startup with SQLAlchemy `create_all`; the repository does not contain a migration tool.
- JWT access tokens contain the user identifier and expire after 60 minutes by default.

## Screenshots

No screenshot images currently exist at `docs/screenshots`, so there are no images to link in this section.

## Git workflow

`main` is the stable branch. Development uses one feature branch per feature, with changes merged into `main` through pull requests. The repository history records these branches:

- `feature/project-setup`
- `feature/event-crud`
- `feature/registrations`
- `feature/search-pagination`
- `feature/jwt-auth`
- `feature/frontend`
- `feature/tests`
- `docs/submission`

Commit messages follow the `type(scope): summary` convention, as in `feat(auth): add token and password handling` and `test(events): cover event CRUD and validation`.

## AI usage

AI tools were used as learning and development assistants for planning, explanation, prompt refinement, and code generation. The developer reviewed each change and remained responsible for testing and commits; see the [AI usage documentation](ai-usage/README.md) for details.

## Author

Gull Snobar
