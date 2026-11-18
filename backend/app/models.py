"""SQLAlchemy ORM models that define the database tables."""

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    select,
)
from sqlalchemy.orm import Mapped, column_property, mapped_column

from .db import Base


class Registration(Base):
    """Represent an employee's registration for an event."""

    __tablename__ = "registrations"
    __table_args__ = (
        UniqueConstraint(
            "event_id",
            "employee_email",
            name="uq_registrations_event_email",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_name: Mapped[str] = mapped_column(String(120), nullable=False)
    employee_email: Mapped[str] = mapped_column(String(254), nullable=False)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # ON DELETE CASCADE removes registrations with their event, so an ORM
    # relationship and its async-unsafe lazy loading are unnecessary.


class Event(Base):
    """Represent an employee event stored in the database."""

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "capacity > 0",
            name="ck_events_capacity_positive",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Loading the count with each Event avoids extra queries and unsupported async
    # lazy loading.
    registered_count: Mapped[int] = column_property(
        select(func.count(Registration.id))
        .where(Registration.event_id == id)
        .correlate_except(Registration)
        .scalar_subquery()
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
