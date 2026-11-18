"""Password hashing, token creation, and authentication dependencies."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from .db import DbSession, settings
from .models import User


password_hasher = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    """Hash a password with pwdlib's recommended secure algorithm."""

    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a plain password against its stored password hash."""

    return password_hasher.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
    """Create a signed JWT for one user with a limited lifetime."""

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": subject, "exp": expires_at},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


async def get_current_user(
    db: DbSession,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    """Return the user identified by a valid bearer token."""

    # The local import avoids a circular import with password helpers.
    from . import services

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        subject = payload.get("sub")
        if subject is None:
            raise credentials_error
        user_id = int(subject)
    except (jwt.InvalidTokenError, TypeError, ValueError) as exc:
        raise credentials_error from exc

    user = await services.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_error

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
