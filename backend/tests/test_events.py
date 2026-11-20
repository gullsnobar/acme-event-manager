"""API tests for creating, reading, updating, and deleting events."""

from collections.abc import Callable
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient


EventPayloadFactory = Callable[..., dict[str, object]]


async def test_create_event(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Creating a valid event while authenticated returns 201."""

    response = await client.post(
        "/events",
        json=event_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Quarterly Planning Workshop"


async def test_create_event_without_login(
    client: AsyncClient,
    event_payload: EventPayloadFactory,
) -> None:
    """Creating an event without authentication returns 401."""

    response = await client.post("/events", json=event_payload())

    assert response.status_code == 401


async def test_create_event_with_blank_title(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Creating an event with a blank title returns 422."""

    response = await client.post(
        "/events",
        json=event_payload(title="   "),
        headers=auth_headers,
    )

    assert response.status_code == 422


async def test_create_event_with_zero_capacity(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Creating an event with zero capacity returns 422."""

    response = await client.post(
        "/events",
        json=event_payload(capacity=0),
        headers=auth_headers,
    )

    assert response.status_code == 422


async def test_create_event_in_past(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Creating an event in the past returns 422."""

    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    response = await client.post(
        "/events",
        json=event_payload(event_date=past_date),
        headers=auth_headers,
    )

    assert response.status_code == 422


async def test_create_event_with_missing_field(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Creating an event with a required field missing returns 422."""

    payload = event_payload()
    del payload["location"]
    response = await client.post("/events", json=payload, headers=auth_headers)

    assert response.status_code == 422


async def test_list_events(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Listing events returns 200 and the stored events."""

    await client.post("/events", json=event_payload(), headers=auth_headers)

    response = await client.get("/events")

    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_get_unknown_event(client: AsyncClient) -> None:
    """Getting an unknown event identifier returns 404."""

    response = await client.get("/events/999999")

    assert response.status_code == 404


async def test_update_event(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Replacing an existing event returns 200 with updated values."""

    created = await client.post(
        "/events", json=event_payload(), headers=auth_headers
    )
    event_id = created.json()["id"]

    response = await client.put(
        f"/events/{event_id}",
        json=event_payload(title="Updated Workshop"),
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Workshop"


async def test_update_unknown_event(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Replacing an unknown event returns 404."""

    response = await client.put(
        "/events/999999",
        json=event_payload(),
        headers=auth_headers,
    )

    assert response.status_code == 404


async def test_delete_event_then_get_it(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Deleting an event returns 204 and makes a later lookup return 404."""

    created = await client.post(
        "/events", json=event_payload(), headers=auth_headers
    )
    event_id = created.json()["id"]

    delete_response = await client.delete(
        f"/events/{event_id}", headers=auth_headers
    )
    get_response = await client.get(f"/events/{event_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


async def test_event_pagination_limit(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """The event limit query parameter caps the number of returned events."""

    for number in range(3):
        await client.post(
            "/events",
            json=event_payload(title=f"Workshop {number}"),
            headers=auth_headers,
        )

    response = await client.get("/events", params={"limit": 2})

    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_event_title_search(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """The title query returns only events containing that text."""

    await client.post(
        "/events",
        json=event_payload(title="Engineering Summit"),
        headers=auth_headers,
    )
    await client.post(
        "/events",
        json=event_payload(title="Sales Planning"),
        headers=auth_headers,
    )

    response = await client.get("/events", params={"title": "engineering"})

    assert response.status_code == 200
    assert [event["title"] for event in response.json()] == [
        "Engineering Summit"
    ]


async def test_event_date_filter(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """The date query returns only events occurring on that UTC date."""

    first_date = datetime.now(timezone.utc) + timedelta(days=30)
    second_date = first_date + timedelta(days=1)
    await client.post(
        "/events",
        json=event_payload(title="First Day", event_date=first_date.isoformat()),
        headers=auth_headers,
    )
    await client.post(
        "/events",
        json=event_payload(title="Second Day", event_date=second_date.isoformat()),
        headers=auth_headers,
    )

    response = await client.get(
        "/events",
        params={"date": first_date.date().isoformat()},
    )

    assert response.status_code == 200
    assert [event["title"] for event in response.json()] == ["First Day"]
