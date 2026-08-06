"""Dashboard API for H2OS companions."""

from __future__ import annotations

import asyncio
import logging
import secrets
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from h2os.capability_catalog import catalog_for_profile, get_capability
from h2os.companion_models import (
    CompanionCreate,
    CompanionCreateResponse,
    CompanionIdentityUpdate,
)
from h2os.companion_store import CompanionStore
from h2os.profile_orchestrator import ProfileOrchestrator
from gateway.platforms.weixin import (
    WEIXIN_CDN_BASE_URL,
    WeixinQrOnboarding,
    WeixinQrState,
    check_weixin_requirements,
)


router = APIRouter(prefix="/api/h2os", tags=["h2os"])
_log = logging.getLogger("hermes_cli.web_server")
_store = CompanionStore()
_orchestrator = ProfileOrchestrator(_store)
_weixin_lock = threading.RLock()


@dataclass
class _WeixinSession:
    request_id: str
    companion_id: str
    profile_name: str
    profile_home: Path
    service: WeixinQrOnboarding
    state: WeixinQrState
    expires_at: float
    status: str = "waiting"
    poll_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_weixin_sessions: dict[str, _WeixinSession] = {}
_WEIXIN_SESSION_TTL_SECONDS = 10 * 60


def _profile_homes():
    from hermes_cli import profiles

    return [item.path for item in profiles.list_profiles()]


def _find(companion_id: str):
    from hermes_cli import profiles

    for companion in _store.list(_profile_homes()):
        if companion.companion_id == companion_id:
            return profiles.get_profile_dir(companion.profile_name), companion
    raise HTTPException(status_code=404, detail="Companion not found")


def _public_weixin_session(session: _WeixinSession) -> dict[str, Any]:
    return {
        "request_id": session.request_id,
        "status": session.status,
        "qr_content": session.state.qr_content,
        "expires_at": min(session.expires_at, session.state.expires_at),
    }


def _get_weixin_session(companion_id: str, request_id: str) -> _WeixinSession:
    with _weixin_lock:
        session = _weixin_sessions.get(request_id)
    if session is None or session.companion_id != companion_id:
        raise HTTPException(status_code=404, detail="Weixin login request not found")
    if session.expires_at <= time.time():
        with _weixin_lock:
            _weixin_sessions.pop(request_id, None)
        raise HTTPException(status_code=410, detail="Weixin login request expired")
    return session


def _finish_weixin_setup(
    session: _WeixinSession,
    credentials: dict[str, str],
) -> dict[str, Any]:
    from hermes_cli.config import save_env_value, write_platform_config_field
    from hermes_constants import reset_hermes_home_override, set_hermes_home_override

    token = set_hermes_home_override(str(session.profile_home))
    try:
        values = {
            "WEIXIN_ACCOUNT_ID": credentials["account_id"],
            "WEIXIN_TOKEN": credentials["token"],
            "WEIXIN_BASE_URL": credentials["base_url"],
            "WEIXIN_CDN_BASE_URL": WEIXIN_CDN_BASE_URL,
            "WEIXIN_DM_POLICY": "pairing",
            "WEIXIN_ALLOW_ALL_USERS": "false",
            "WEIXIN_ALLOWED_USERS": "",
            "WEIXIN_GROUP_POLICY": "disabled",
        }
        for key, value in values.items():
            save_env_value(key, value)
        write_platform_config_field("weixin", "enabled", True)
    finally:
        reset_hermes_home_override(token)

    _home, companion = _find(session.companion_id)
    companion.channel = "weixin"
    companion.setup_status = "ready"
    companion.setup_step = "gateway"
    companion.setup_error = None
    companion.updated_at = datetime.now(timezone.utc)
    _store.save(session.profile_home, companion)

    from hermes_cli.web_deps import late

    restart: dict[str, Any]
    try:
        proc, reused = late("_spawn_gateway_restart")(session.profile_name)
        restart = {
            "gateway_restart_started": True,
            "gateway_restart_reused": reused,
            "gateway_restart_pid": proc.pid,
        }
    except Exception as exc:
        _log.exception("Starting gateway for companion %s failed", session.companion_id)
        restart = {
            "gateway_restart_started": False,
            "gateway_restart_error": str(exc),
        }
    return {"companion": companion, **restart}


@router.post("/companions", response_model=CompanionCreateResponse, status_code=201)
def create_companion(body: CompanionCreate):
    try:
        companion = _orchestrator.create(body)
    except (ValueError, FileExistsError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        _log.exception("POST /api/h2os/companions failed")
        raise HTTPException(
            status_code=500,
            detail="Companion setup failed. The partial profile was kept so setup can resume.",
        ) from exc
    return CompanionCreateResponse(
        companion_id=companion.companion_id,
        profile_name=companion.profile_name,
        setup_status=companion.setup_status,
        next_step="weixin" if companion.setup_status == "needs_channel" else None,
    )


@router.get("/companions")
def list_companions():
    return {"companions": _store.list(_profile_homes())}


@router.get("/companions/{companion_id}")
def get_companion(companion_id: str):
    _home, companion = _find(companion_id)
    return companion


@router.put("/companions/{companion_id}/identity")
def update_identity(companion_id: str, body: CompanionIdentityUpdate):
    home, companion = _find(companion_id)
    try:
        return _orchestrator.update_identity(home, companion, body, body.avatar_data_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Could not save companion identity") from exc


@router.post("/companions/{companion_id}/channels/weixin/start")
async def start_weixin_onboarding(companion_id: str):
    home, companion = _find(companion_id)
    if not check_weixin_requirements():
        raise HTTPException(
            status_code=503,
            detail="Weixin requires the aiohttp and cryptography dependencies",
        )
    service = WeixinQrOnboarding(str(home))
    try:
        state = await service.start()
    except Exception as exc:
        _log.exception("Starting Weixin QR login failed")
        raise HTTPException(status_code=502, detail="Could not request a Weixin QR code") from exc

    session = _WeixinSession(
        request_id=secrets.token_urlsafe(24),
        companion_id=companion_id,
        profile_name=companion.profile_name,
        profile_home=home,
        service=service,
        state=state,
        expires_at=time.time() + _WEIXIN_SESSION_TTL_SECONDS,
    )
    with _weixin_lock:
        stale = [
            key
            for key, value in _weixin_sessions.items()
            if value.companion_id == companion_id or value.expires_at <= time.time()
        ]
        for key in stale:
            _weixin_sessions.pop(key, None)
        _weixin_sessions[session.request_id] = session
    return _public_weixin_session(session)


@router.get("/companions/{companion_id}/channels/weixin/status")
async def get_weixin_onboarding_status(companion_id: str, request_id: str):
    session = _get_weixin_session(companion_id, request_id)
    async with session.poll_lock:
        if session.status == "confirmed":
            return {"request_id": request_id, "status": "confirmed"}
        try:
            result = await session.service.poll(session.state)
        except Exception as exc:
            _log.exception("Polling Weixin QR login failed")
            raise HTTPException(status_code=502, detail="Could not check Weixin login") from exc

        session.status = str(result["status"])
        if session.status == "confirmed":
            completion = _finish_weixin_setup(session, result["credentials"])
            # Credentials are deliberately excluded from the response.
            return {
                "request_id": request_id,
                "status": "confirmed",
                **completion,
            }
        return _public_weixin_session(session)


@router.delete("/companions/{companion_id}/channels/weixin")
def cancel_weixin_onboarding(companion_id: str, request_id: str):
    _get_weixin_session(companion_id, request_id)
    with _weixin_lock:
        _weixin_sessions.pop(request_id, None)
    return {"ok": True}


@router.get("/companions/{companion_id}/capabilities")
def list_capabilities(companion_id: str):
    home, _companion = _find(companion_id)
    return {"capabilities": catalog_for_profile(home)}


@router.post("/companions/{companion_id}/capabilities/{capability_id}/install")
def install_capability(companion_id: str, capability_id: str):
    _home, companion = _find(companion_id)
    try:
        capability = get_capability(capability_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Capability not found") from exc
    if capability.status != "available" or not capability.skill_identifier:
        raise HTTPException(status_code=409, detail="Capability is not available yet")

    # Use the same scoped CLI path as the generic Skills dashboard. This keeps
    # quarantine, scanning, lock files, and install semantics in one place.
    from hermes_cli.web_deps import late

    try:
        proc = late("_spawn_hermes_action")(
            [
                "-p",
                companion.profile_name,
                "skills",
                "install",
                capability.skill_identifier,
                "--yes",
            ],
            f"h2os-install-{companion.profile_name}-{capability.id}",
        )
    except Exception as exc:
        _log.exception("Installing H2OS capability %s failed", capability_id)
        raise HTTPException(
            status_code=500, detail="Could not start capability installation"
        ) from exc
    return {"ok": True, "status": "installing", "pid": proc.pid}
