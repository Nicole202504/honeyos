"""Transactional-ish companion provisioning around Hermes profile primitives."""

from __future__ import annotations

import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from hermes_constants import reset_hermes_home_override, set_hermes_home_override
from hermes_cli.config import load_config, save_config, save_env_value
from hermes_cli.provider_catalog import provider_catalog_by_slug
from utils import atomic_write_text

from .companion_models import CompanionCreate, CompanionIdentity, CompanionMetadata
from .companion_store import CompanionStore
from .memory_config import apply_memory_defaults, seed_initial_memory
from .soul_renderer import render_soul


_PROFILE_SAFE_RE = re.compile(r"[^a-z0-9]+")


def new_companion_id() -> str:
    alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    value = int(time.time() * 1000)
    timestamp = ""
    for _ in range(10):
        timestamp = alphabet[value & 31] + timestamp
        value >>= 5
    return f"cmp_{timestamp}{secrets.token_hex(8).upper()}"


def profile_slug(display_name: str) -> str:
    stem = _PROFILE_SAFE_RE.sub("-", display_name.lower()).strip("-")[:42]
    if not stem:
        stem = "companion"
    return f"{stem}-{secrets.token_hex(2)}"


class ProfileOrchestrator:
    def __init__(self, store: CompanionStore | None = None):
        self.store = store or CompanionStore()

    def create(self, request: CompanionCreate) -> CompanionMetadata:
        from hermes_cli import profiles

        descriptor = provider_catalog_by_slug().get(request.provider)
        if descriptor is None:
            raise ValueError(f"Unknown provider: {request.provider}")
        if request.api_key and not descriptor.api_key_env_vars:
            raise ValueError(f"Provider '{request.provider}' does not accept an API key")

        companion_id = new_companion_id()
        name = profile_slug(request.display_name)
        while profiles.profile_exists(name):
            name = profile_slug(request.display_name)
        profile_home = profiles.create_profile(
            name=name,
            no_alias=True,
            no_skills=True,
            description=f"H2OS companion: {request.display_name}",
        )
        now = datetime.now(timezone.utc)
        companion = CompanionMetadata(
            companion_id=companion_id,
            profile_name=name,
            display_name=request.display_name,
            relationship_type=request.relationship_type,
            personality=request.personality,
            communication_style=request.communication_style,
            boundaries=request.boundaries,
            advanced_system_prompt=request.advanced_system_prompt,
            provider=request.provider,
            model=request.model,
            created_at=now,
            updated_at=now,
            setup_status="provisioning",
            setup_step="profile",
        )
        self.store.save(profile_home, companion)

        try:
            self._configure_runtime(profile_home, request, descriptor.api_key_env_vars)
            companion.setup_step = "avatar"
            self.store.save(profile_home, companion)
            companion.avatar = self.store.save_avatar(profile_home, request.avatar_data_url)

            companion.setup_step = "identity"
            self.store.save(profile_home, companion)
            atomic_write_text(
                profile_home / "SOUL.md",
                render_soul(request),
                preserve_mode=True,
                create_mode=0o644,
            )

            companion.setup_step = "memory"
            self.store.save(profile_home, companion)
            seed_initial_memory(profile_home, request, now)

            companion.setup_status = "needs_channel"
            companion.setup_step = "channel"
            companion.setup_error = None
            companion.updated_at = datetime.now(timezone.utc)
            self.store.save(profile_home, companion)
            return companion
        except Exception as exc:
            companion.setup_status = "error"
            error_message = str(exc)
            if request.api_key:
                error_message = error_message.replace(
                    request.api_key.get_secret_value(), "***"
                )
            companion.setup_error = f"{type(exc).__name__}: {error_message}"
            companion.updated_at = datetime.now(timezone.utc)
            self.store.save(profile_home, companion)
            raise

    def _configure_runtime(
        self,
        profile_home: Path,
        request: CompanionCreate,
        api_key_env_vars: tuple[str, ...],
    ) -> None:
        token = set_hermes_home_override(str(profile_home))
        try:
            config = load_config()
            model = config.setdefault("model", {})
            if not isinstance(model, dict):
                model = {}
                config["model"] = model
            model.update({"provider": request.provider, "default": request.model})
            model.pop("api_key", None)
            apply_memory_defaults(config)
            save_config(config)
            if request.api_key:
                save_env_value(api_key_env_vars[0], request.api_key.get_secret_value())
        finally:
            reset_hermes_home_override(token)

    def update_identity(
        self,
        profile_home: Path,
        companion: CompanionMetadata,
        identity: CompanionIdentity,
        avatar_data_url: str | None = None,
    ) -> CompanionMetadata:
        for field in (
            "display_name",
            "relationship_type",
            "personality",
            "communication_style",
            "boundaries",
            "advanced_system_prompt",
        ):
            setattr(companion, field, getattr(identity, field))
        if avatar_data_url:
            companion.avatar = self.store.save_avatar(profile_home, avatar_data_url)
        atomic_write_text(
            Path(profile_home) / "SOUL.md",
            render_soul(identity),
            preserve_mode=True,
            create_mode=0o644,
        )
        companion.updated_at = datetime.now(timezone.utc)
        self.store.save(profile_home, companion)
        return companion
