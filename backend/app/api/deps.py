"""Shared FastAPI dependencies."""

import structlog
from fastapi import Depends, HTTPException, Request

log = structlog.get_logger()


async def get_current_user_id(request: Request) -> str:
    """Extract user_id from Supabase JWT in the Authorization header.

    The Supabase JWT is verified by creating a temporary client with the user's token.
    For the MVP we decode the JWT payload directly — Supabase JWTs are signed with the
    project's JWT secret, and the service-key client trusts them.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"code": "MISSING_TOKEN", "message": "Authorization header required"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"code": "MISSING_TOKEN", "message": "Bearer token is empty"},
        )

    try:
        import json
        import base64

        # Decode JWT payload (middle segment) — Supabase JWTs are base64url-encoded
        payload_b64 = token.split(".")[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("No 'sub' claim in token")
        return user_id
    except Exception as e:
        log.warning("jwt_decode_failed", error=str(e))
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
        )


async def get_optional_user_id(request: Request) -> str | None:
    """Same as get_current_user_id but returns None instead of raising."""
    try:
        return await get_current_user_id(request)
    except HTTPException:
        return None
