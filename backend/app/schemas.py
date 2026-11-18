"""Pydantic schemas for request validation and response serialization."""

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EventFields(BaseModel):
    """Define the fields shared by event requests and responses."""

    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(
        min_length=1,
        max_length=200,
        description="Short name employees will see for the event.",
        examples=["Quarterly planning workshop"],
    )
    description: str = Field(
        min_length=1,
        max_length=2000,
        description="A clear explanation of the event and its purpose.",
        examples=["Review quarterly goals and agree on next steps."],
    )
    event_date: datetime = Field(
        description="Date and time when the event begins.",
        examples=["2027-03-15T09:30:00Z"],
    )
    location: str = Field(
        min_length=1,
        max_length=200,
        description="Physical or online location of the event.",
        examples=["Conference Room A"],
    )
    capacity: int = Field(
        gt=0,
        description="Maximum number of employees who may attend.",
        examples=[40],
    )


class EventInput(EventFields):
    """Validate fields supplied when an event is created or replaced."""

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: datetime) -> datetime:
        """Treat naive dates as UTC and require the event to be in the future."""

        if value.tzinfo is None or value.utcoffset() is None:
            value = value.replace(tzinfo=timezone.utc)

        if value <= datetime.now(timezone.utc):
            raise ValueError("Event date must be in the future.")

        return value


class EventCreate(EventInput):
    """Validate the complete payload used to create an event."""


class EventUpdate(EventInput):
    """Validate the complete payload used to replace an event."""


class EventRead(EventFields):
    """Serialize an event returned from the database."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        from_attributes=True,
    )

    id: int
    created_at: datetime


class ErrorResponse(BaseModel):
    """Describe a plain-language API error response."""

    detail: str
