"""Profile-scoped channel configuration for H2OS companions."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Mapping

from gateway.platforms.weixin import WEIXIN_CDN_BASE_URL
from hermes_cli.config import save_env_value, write_platform_config_field
from hermes_constants import reset_hermes_home_override, set_hermes_home_override

from .companion_models import CompanionMetadata
from .companion_store import CompanionStore


class CompanionChannelService:
    """Persist channel credentials without reimplementing Hermes Gateway."""

    def __init__(self, store: CompanionStore | None = None) -> None:
        self.store = store or CompanionStore()

    def configure_weixin(
        self,
        profile_home: Path,
        companion: CompanionMetadata,
        credentials: Mapping[str, str],
    ) -> CompanionMetadata:
        owner_id = str(credentials.get("user_id") or "").strip()
        values = {
            "WEIXIN_ACCOUNT_ID": credentials["account_id"],
            "WEIXIN_TOKEN": credentials["token"],
            "WEIXIN_BASE_URL": credentials["base_url"],
            "WEIXIN_CDN_BASE_URL": WEIXIN_CDN_BASE_URL,
            "WEIXIN_DM_POLICY": "allowlist" if owner_id else "pairing",
            "WEIXIN_ALLOW_ALL_USERS": "false",
            "WEIXIN_ALLOWED_USERS": owner_id,
            "WEIXIN_GROUP_POLICY": "disabled",
            "WEIXIN_GROUP_ALLOWED_USERS": "",
            "WEIXIN_HOME_CHANNEL": owner_id,
            "WEIXIN_HOME_CHANNEL_NAME": "Owner",
        }
        token = set_hermes_home_override(str(profile_home))
        try:
            for key, value in values.items():
                save_env_value(key, value)
            write_platform_config_field("weixin", "enabled", True)
        finally:
            reset_hermes_home_override(token)

        companion.channel = "weixin"
        companion.setup_status = "ready"
        companion.setup_step = "gateway"
        companion.setup_error = None
        companion.updated_at = datetime.now(timezone.utc)
        self.store.save(profile_home, companion)
        return companion
