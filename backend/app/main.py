"""Create the FastAPI application and define its API routes."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Models must be imported so Base knows about the tables.
from . import models, services
from .db import Base, DbSession, engine, settings
from .schemas import ErrorResponse, EventCreate, EventRead, EventUpdate
from .services import ConflictError, NotFoundError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create missing tables at startup and release connections at shutdown."""

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    try:
        yield
    finally:
        await engine.dispose()


app = FastAPI(
    title="Acme Event Manager API",
    description=(
        "Internal API for managing Acme Corp events and attendee registrations."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS lets the separately hosted React frontend call this API in a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def handle_not_found_error(
    request: Request,
    exc: NotFoundError,
) -> JSONResponse:
    """Convert a missing domain object into an HTTP 404 response."""

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)},
    )


@app.exception_handler(ConflictError)
async def handle_conflict_error(
    request: Request,
    exc: ConflictError,
) -> JSONResponse:
    """Convert a domain conflict into an HTTP 409 response."""

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc)},
    )


@app.get(
    "/health",
    tags=["Health"],
    summary="Check API and database status",
)
async def health_check(db: DbSession) -> dict[str, str]:
    """Check that the API can execute a simple database query."""

    try:
        await db.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Database is unreachable.",
        ) from exc

    return {"status": "ok", "database": "connected"}


@app.post(
    "/events",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Events"],
    summary="Create an event",
)
async def create_event(data: EventCreate, db: DbSession) -> EventRead:
    """Create a new employee event."""

    return await services.create_event(db, data)


@app.get(
    "/events",
    response_model=list[EventRead],
    tags=["Events"],
    summary="List events",
)
async def list_events(db: DbSession) -> list[EventRead]:
    """List all events by date, then by identifier."""

    return await services.list_events(db)


@app.get(
    "/events/{event_id}",
    response_model=EventRead,
    tags=["Events"],
    summary="Get an event",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Event not found.",
        },
    },
)
async def get_event(event_id: int, db: DbSession) -> EventRead:
    """Return one event by its identifier."""

    return await services.get_event(db, event_id)


@app.put(
    "/events/{event_id}",
    response_model=EventRead,
    tags=["Events"],
    summary="Update an event",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Event not found.",
        },
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "model": ErrorResponse,
            "description": "Event data is invalid.",
        },
    },
)
async def update_event(
    event_id: int,
    data: EventUpdate,
    db: DbSession,
) -> EventRead:
    """Replace every editable field on an event."""

    return await services.update_event(db, event_id, data)


@app.delete(
    "/events/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Events"],
    summary="Delete an event",
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ErrorResponse,
            "description": "Event not found.",
        },
    },
)
async def delete_event(event_id: int, db: DbSession) -> None:
    """Delete an event by its identifier."""

    await services.delete_event(db, event_id)
