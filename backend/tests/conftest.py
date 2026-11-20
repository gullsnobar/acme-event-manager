"""Shared fixtures for isolated API tests."""

from collections.abc import AsyncIterator, Callable
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.db import Base, get_db, settings
from app.main import app


TEST_DATABASE_MESSAGE = (
    "TEST_DATABASE_URL is not set; tests require a separate database that may "
    "be safely wiped."
)

test_engine: AsyncEngine | None = None
TestSessionLocal: async_sessionmaker[AsyncSession] | None = None

if settings.test_database_url is not None:
    # NullPool avoids sharing connections between event loops.
    test_engine = create_async_engine(
        settings.test_database_url,
        poolclass=NullPool,
    )
    TestSessionLocal = async_sessionmaker(
        test_engine,
        expire_on_commit=False,
    )


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Skip every collected test when no isolated database is configured."""

    if settings.test_database_url is None:
        skip_marker = pytest.mark.skip(reason=TEST_DATABASE_MESSAGE)
        for item in items:
            item.add_marker(skip_marker)


@pytest.fixture(autouse=True)
async def reset_database() -> AsyncIterator[None]:
    """Recreate every table so each test starts with an empty database."""

    if test_engine is None:
        yield
        return

    async with test_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    yield


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Return an HTTP client whose database sessions use the test engine."""

    if TestSessionLocal is None:
        pytest.skip(TEST_DATABASE_MESSAGE)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        """Yield one request session connected only to the test database."""

        assert TestSessionLocal is not None
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Register and sign in a user, then return bearer authorization headers."""

    email = "test.user@acme.com"
    password = "secure-password"
    register_response = await client.post(
        "/auth/register",
        json={
            "full_name": "Test User",
            "email": email,
            "password": password,
        },
    )
    assert register_response.status_code == 201

    login_response = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def event_payload() -> Callable[..., dict[str, object]]:
    """Return a factory for valid future event payloads with field overrides."""

    def make_event_payload(**overrides: object) -> dict[str, object]:
        """Build one valid event payload and apply requested field overrides."""

        payload: dict[str, object] = {
            "title": "Quarterly Planning Workshop",
            "description": "Review goals and agree on next steps.",
            "event_date": (
                datetime.now(timezone.utc) + timedelta(days=30)
            ).isoformat(),
            "location": "Conference Room A",
            "capacity": 20,
        }
        payload.update(overrides)
        return payload

    return make_event_payload
