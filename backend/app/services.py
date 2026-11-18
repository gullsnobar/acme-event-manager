"""Business logic and database operations, kept separate from API routes."""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Event, Registration
from .schemas import EventCreate, EventUpdate, RegistrationCreate


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


async def list_events(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 10,
    title: str | None = None,
    event_date: date | None = None,
) -> list[Event]:
    """Return a filtered page of events in chronological order."""

    statement = select(Event)

    if title is not None:
        statement = statement.where(Event.title.ilike(f"%{title}%"))

    if event_date is not None:
        day_start = datetime.combine(
            event_date,
            time.min,
            tzinfo=timezone.utc,
        )
        day_end = day_start + timedelta(days=1)
        statement = statement.where(
            Event.event_date >= day_start,
            Event.event_date < day_end,
        )

    statement = (
        statement.order_by(Event.event_date, Event.id)
        .offset(skip)
        .limit(limit)
    )
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

    if data.capacity < event.registered_count:
        raise ConflictError(
            "Capacity cannot be lower than the current number of registrations."
        )

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


async def register_for_event(
    db: AsyncSession,
    event_id: int,
    data: RegistrationCreate,
) -> Registration:
    """Register one employee when the event exists and has an available seat."""

    # The row lock stops two employees taking the last seat at the same moment.
    capacity_statement = (
        select(Event.capacity)
        .where(Event.id == event_id)
        .with_for_update()
    )
    capacity_result = await db.execute(capacity_statement)
    capacity = capacity_result.scalar_one_or_none()

    if capacity is None:
        raise NotFoundError("Event not found.")

    duplicate_statement = select(Registration.id).where(
        Registration.event_id == event_id,
        Registration.employee_email == data.employee_email,
    )
    duplicate_result = await db.execute(duplicate_statement)

    if duplicate_result.scalar_one_or_none() is not None:
        await db.rollback()
        raise ConflictError(
            "This email is already registered for this event."
        )

    count_statement = select(func.count(Registration.id)).where(
        Registration.event_id == event_id
    )
    count_result = await db.execute(count_statement)
    registration_count = count_result.scalar_one()

    if registration_count >= capacity:
        await db.rollback()
        raise ConflictError("This event is full.")

    registration = Registration(
        event_id=event_id,
        employee_name=data.employee_name,
        employee_email=data.employee_email,
    )
    db.add(registration)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise ConflictError(
            "This email is already registered for this event."
        ) from exc

    await db.refresh(registration)
    return registration


async def list_registrations(
    db: AsyncSession,
    event_id: int,
    skip: int = 0,
    limit: int = 10,
) -> list[Registration]:
    """Return a page of an event's registrations in registration order."""

    await get_event(db, event_id)
    statement = (
        select(Registration)
        .where(Registration.event_id == event_id)
        .order_by(Registration.registered_at)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(statement)
    return list(result.scalars().all())


async def cancel_registration(
    db: AsyncSession,
    registration_id: int,
) -> None:
    """Delete a registration or raise a domain error when it is missing."""

    statement = select(Registration).where(
        Registration.id == registration_id
    )
    result = await db.execute(statement)
    registration = result.scalar_one_or_none()

    if registration is None:
        raise NotFoundError("Registration not found.")

    await db.delete(registration)
    await db.commit()
