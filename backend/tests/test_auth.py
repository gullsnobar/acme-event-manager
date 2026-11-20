"""API tests for account registration and authentication."""

from httpx import AsyncClient


async def test_register_account(client: AsyncClient) -> None:
    """A valid account registration returns 201."""

    response = await client.post(
        "/auth/register",
        json={
            "full_name": "Ali Khan",
            "email": "ali.khan@acme.com",
            "password": "strong-password",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == "ali.khan@acme.com"


async def test_duplicate_account_returns_conflict(client: AsyncClient) -> None:
    """Registering the same account twice returns 409."""

    payload = {
        "full_name": "Ali Khan",
        "email": "ali.khan@acme.com",
        "password": "strong-password",
    }
    assert (await client.post("/auth/register", json=payload)).status_code == 201

    response = await client.post("/auth/register", json=payload)

    assert response.status_code == 409


async def test_wrong_password_returns_unauthorized(client: AsyncClient) -> None:
    """Signing in with the wrong password returns 401."""

    await client.post(
        "/auth/register",
        json={
            "full_name": "Ali Khan",
            "email": "ali.khan@acme.com",
            "password": "strong-password",
        },
    )

    response = await client.post(
        "/auth/login",
        data={"username": "ali.khan@acme.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


async def test_me_with_token(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    """An authenticated request to the current-account endpoint returns 200."""

    response = await client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == "test.user@acme.com"


async def test_me_without_token(client: AsyncClient) -> None:
    """A current-account request without a token returns 401."""

    response = await client.get("/auth/me")

    assert response.status_code == 401
