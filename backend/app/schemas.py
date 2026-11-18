"""Pydantic schemas for request validation and response serialization."""

from datetime import datetime, timezone

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    computed_field,
    field_validator,
)


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
    registered_count: int

    @computed_field
    @property
    def seats_left(self) -> int:
        """Return the number of registration places still available."""

        return self.capacity - self.registered_count


class RegistrationCreate(BaseModel):
    """Validate the employee details used to register for an event."""

    model_config = ConfigDict(str_strip_whitespace=True)

    employee_name: str = Field(
        min_length=1,
        max_length=120,
        description="Full name of the employee attending the event.",
        examples=["Ali Khan"],
    )
    employee_email: EmailStr = Field(
        description="Work email address used to identify the attendee.",
        examples=["ali.khan@acme.com"],
    )

    @field_validator("employee_email")
    @classmethod
    def lowercase_email(cls, value: EmailStr) -> str:
        """Store email addresses in lowercase for consistent comparisons."""

        return value.lower()


class RegistrationRead(BaseModel):
    """Serialize a registration returned from the database."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    employee_name: str
    employee_email: EmailStr
    registered_at: datetime


class UserCreate(BaseModel):
    """Validate the details used to create an employee account."""

    full_name: str = Field(
        min_length=1,
        max_length=120,
        description="Full name of the employee who owns the account.",
        examples=["Ali Khan"],
    )
    email: EmailStr = Field(
        description="Work email address used to sign in.",
        examples=["ali.khan@acme.com"],
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Password used to protect the account.",
        examples=["correct horse battery staple"],
    )

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: EmailStr) -> str:
        """Store account email addresses in lowercase for consistent sign-in."""

        return value.lower()


class UserRead(BaseModel):
    """Serialize public account details without exposing the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    """Return the bearer token created after a successful sign-in."""

    access_token: str
    token_type: str


class ErrorResponse(BaseModel):
    """Describe a plain-language API error response."""

    detail: str
