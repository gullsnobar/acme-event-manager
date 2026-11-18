"""Database settings, engine, and session dependency."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Settings(BaseSettings):
    """Load database and frontend configuration from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    database_url: str
    frontend_origin: str = "http://localhost:5173"
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


settings = Settings()

# Set echo=True temporarily when SQL output is useful for debugging.
engine = create_async_engine(settings.database_url, echo=False)

# Keeping values available after commit avoids unnecessary follow-up queries.
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Provide the shared declarative base for all database models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a request session that is always closed after the request ends."""

    async with AsyncSessionLocal() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]
