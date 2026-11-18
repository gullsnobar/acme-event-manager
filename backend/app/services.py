"""Business logic and database operations, kept separate from API routes."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Event
from .schemas import EventCreate, EventUpdate


class NotFoundError(Exception):
    """Indicate that a requested domain object does not exist."""


class ConflictError(Exception):
    """Indicate that a requested operation conflicts with existing data."""


async def create_event(db: AsyncSession, data: EventCreate) -> Event:
    """Create and return a new event."""

    event = Event(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def list_events(db: AsyncSession) -> list[Event]:
    """Return all events in chronological order."""

    statement = select(Event).order_by(Event.event_date, Event.id)
    result = await db.execute(statement)
    return list(result.scalars().all())


async def get_event(db: AsyncSession, event_id: int) -> Event:
    """Return one event or raise a domain error when it is missing."""

    statement = select(Event).where(Event.id == event_id)
    result = await db.execute(statement)
    event = result.scalar_one_or_none()

    if event is None:
        raise NotFoundError("Event not found.")

    return event


async def update_event(
    db: AsyncSession,
    event_id: int,
    data: EventUpdate,
) -> Event:
    """Replace every editable field on an existing event."""

    event = await get_event(db, event_id)
    event.title = data.title
    event.description = data.description
    event.event_date = data.event_date
    event.location = data.location
    event.capacity = data.capacity

    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(db: AsyncSession, event_id: int) -> None:
    """Delete an existing event."""

    event = await get_event(db, event_id)
    await db.delete(event)
    await db.commit()
