# AGENTS.md: Acme Event Manager

## Project
Course assignment: REST API for Acme Corp's internal event management system. Employees create and
manage events and register attendees. The developer is a junior engineer who must understand and
explain every line, so prefer clear, simple code over clever code.

## Backend stack
Python 3.14, FastAPI, PostgreSQL 18, SQLAlchemy 2.x async with asyncpg, Pydantic v2, pydantic-settings.

## Backend structure (fixed by the assignment)
backend/app/db.py        settings, async engine, session dependency, Base
backend/app/models.py    SQLAlchemy ORM models
backend/app/schemas.py   Pydantic request and response schemas
backend/app/services.py  business logic and database operations
backend/app/main.py      FastAPI app, exception handlers and API routes
(backend/app/auth.py is allowed later for JWT only.)

## Backend rules
- Only create or change the files named in the current prompt.
- Do not install packages or edit requirements.txt unless asked.
- Never run git commands that change history. The developer handles Git.
- Never read, print or modify backend/.env.
- Every module, class and function has a docstring. Comments explain why, not what.
- Type hints everywhere, PEP 8 formatting, meaningful names, no duplication.
- Routes in main.py stay thin. Business rules and queries live in services.py.
- services.py never uses HTTP concepts (no HTTPException, no status codes); it raises domain
  exceptions that main.py converts to HTTP responses.
- Modern SQLAlchemy 2.x only: Mapped, mapped_column, select(), AsyncSession, async/await.
- Do not add features, endpoints or abstractions beyond what the prompt asks for.
- After every change, summarise what changed and explain key decisions in simple English.

## Frontend (frontend/ folder, built later)
- React with Vite and plain CSS using CSS custom properties as design tokens.
- No UI kits, no icon libraries, no emoji, no decorative slashes, separators or ornaments.
- Audience: non-technical employees. Plain-language labels, buttons with clear text, helpful
  empty, loading and error states, confirmation before deleting anything.
- Palette (one accent only): ink #0B1220, surface #F7F8FA and #FFFFFF, accent #1D4ED8,
  muted text #5B6577, success #15803D, warning #B45309, danger #B91C1C.
- Smooth but restrained motion: short CSS transitions (150 to 250 ms), respect prefers-reduced-motion.
- Accessible: semantic HTML, labels on every input, visible focus states, fully keyboard usable.

## Running
Backend, from backend/ with the venv active: uvicorn app.main:app --reload
API docs: http://127.0.0.1:8000/docs
