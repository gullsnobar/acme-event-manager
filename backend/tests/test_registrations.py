"""API tests for event registration behavior."""

from collections.abc import Callable

from httpx import AsyncClient


EventPayloadFactory = Callable[..., dict[str, object]]


async def create_event(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
    **overrides: object,
) -> dict[str, object]:
    """Create an event through the API and return its response body."""

    response = await client.post(
        "/events",
        json=event_payload(**overrides),
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()


async def test_register_for_event(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Registering valid attendee details returns 201."""

    event = await create_event(client, auth_headers, event_payload)

    response = await client.post(
        f"/events/{event['id']}/registrations",
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )

    assert response.status_code == 201
    assert response.json()["employee_email"] == "sara@acme.com"


async def test_duplicate_registration_ignores_email_case(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Registering the same email with different case returns 409."""

    event = await create_event(client, auth_headers, event_payload)
    url = f"/events/{event['id']}/registrations"
    first_response = await client.post(
        url,
        json={"employee_name": "Sara Ahmed", "employee_email": "Sara@Acme.com"},
    )

    response = await client.post(
        url,
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )

    assert first_response.status_code == 201
    assert response.status_code == 409


async def test_event_full(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Registering after an event reaches capacity returns 409."""

    event = await create_event(client, auth_headers, event_payload, capacity=1)
    url = f"/events/{event['id']}/registrations"
    await client.post(
        url,
        json={"employee_name": "First User", "employee_email": "first@acme.com"},
    )

    response = await client.post(
        url,
        json={"employee_name": "Second User", "employee_email": "second@acme.com"},
    )

    assert response.status_code == 409


async def test_register_for_unknown_event(client: AsyncClient) -> None:
    """Registering for an unknown event returns 404."""

    response = await client.post(
        "/events/999999/registrations",
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )

    assert response.status_code == 404


async def test_register_with_invalid_email(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Registering with an invalid email address returns 422."""

    event = await create_event(client, auth_headers, event_payload)

    response = await client.post(
        f"/events/{event['id']}/registrations",
        json={"employee_name": "Sara Ahmed", "employee_email": "not-an-email"},
    )

    assert response.status_code == 422


async def test_list_registrations(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Listing an event's registrations returns 200 and its attendees."""

    event = await create_event(client, auth_headers, event_payload)
    url = f"/events/{event['id']}/registrations"
    await client.post(
        url,
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )

    response = await client.get(url)

    assert response.status_code == 200
    assert len(response.json()) == 1


async def test_cancel_registration(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Cancelling an existing registration returns 204."""

    event = await create_event(client, auth_headers, event_payload)
    registration = await client.post(
        f"/events/{event['id']}/registrations",
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )

    response = await client.delete(
        f"/registrations/{registration.json()['id']}"
    )

    assert response.status_code == 204


async def test_cancel_unknown_registration(client: AsyncClient) -> None:
    """Cancelling an unknown registration returns 404."""

    response = await client.delete("/registrations/999999")

    assert response.status_code == 404


async def test_lower_capacity_below_registrations(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Lowering capacity below the registration count returns 409."""

    event = await create_event(client, auth_headers, event_payload, capacity=3)
    url = f"/events/{event['id']}/registrations"
    for number in range(2):
        await client.post(
            url,
            json={
                "employee_name": f"Employee {number}",
                "employee_email": f"employee{number}@acme.com",
            },
        )

    response = await client.put(
        f"/events/{event['id']}",
        json=event_payload(capacity=1),
        headers=auth_headers,
    )

    assert response.status_code == 409


async def test_deleting_event_removes_registrations(
    client: AsyncClient,
    auth_headers: dict[str, str],
    event_payload: EventPayloadFactory,
) -> None:
    """Deleting an event also removes its registrations from the database."""

    event = await create_event(client, auth_headers, event_payload)
    registration = await client.post(
        f"/events/{event['id']}/registrations",
        json={"employee_name": "Sara Ahmed", "employee_email": "sara@acme.com"},
    )
    registration_id = registration.json()["id"]

    delete_event_response = await client.delete(
        f"/events/{event['id']}", headers=auth_headers
    )
    cancel_response = await client.delete(f"/registrations/{registration_id}")

    assert delete_event_response.status_code == 204
    assert cancel_response.status_code == 404
