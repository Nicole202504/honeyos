"""Terminal entry points for running H2OS companions through Hermes Gateway."""

from __future__ import annotations

import asyncio
import os
import sys

from gateway.platforms.weixin import check_weixin_requirements, qr_login

from .channel_service import CompanionChannelService
from .companion_store import CompanionStore


def _companions():
    from hermes_cli import profiles

    store = CompanionStore()
    homes = [item.path for item in profiles.list_profiles()]
    return [(profiles.get_profile_dir(item.profile_name), item) for item in store.list(homes)]


def resolve_companion(identifier: str):
    wanted = identifier.strip().lower()
    matches = [
        item
        for item in _companions()
        if wanted
        in {
            item[1].companion_id.lower(),
            item[1].profile_name.lower(),
            item[1].display_name.lower(),
        }
    ]
    if not matches:
        raise ValueError(f"Companion not found: {identifier}")
    if len(matches) > 1:
        raise ValueError(f"Companion name is ambiguous: {identifier}")
    return matches[0]


def list_companions() -> int:
    items = _companions()
    if not items:
        print("No H2OS companions yet. Create one in `hermes dashboard` first.")
        return 0
    print("Companion                 Profile                    Channel    Gateway command")
    for _home, companion in items:
        channel = companion.channel or "not connected"
        print(
            f"{companion.display_name[:24]:24}  {companion.profile_name[:26]:26} "
            f" {channel:10} hermes companion run {companion.profile_name}"
        )
    return 0


def connect_weixin(identifier: str) -> int:
    if not check_weixin_requirements():
        print("Weixin requires aiohttp and cryptography. Install Hermes messaging extras.")
        return 1
    home, companion = resolve_companion(identifier)
    credentials = asyncio.run(qr_login(str(home)))
    if not credentials:
        print("Weixin login did not complete.")
        return 1
    CompanionChannelService().configure_weixin(home, companion, credentials)
    print()
    print(f"✓ {companion.display_name} is connected to your Weixin owner account.")
    print(f"  Run: hermes companion run {companion.profile_name}")
    print("  Then send the iLink Bot a message in Weixin.")
    return 0


def run_companion(identifier: str) -> int:
    _home, companion = resolve_companion(identifier)
    if companion.channel != "weixin":
        print(
            f"{companion.display_name} is not connected to Weixin. Run: "
            f"hermes companion connect-weixin {companion.profile_name}"
        )
        return 1
    argv = [
        sys.executable,
        "-m",
        "hermes_cli.main",
        "--profile",
        companion.profile_name,
        "gateway",
        "run",
        "--replace",
    ]
    os.execv(sys.executable, argv)
    return 0  # pragma: no cover - os.execv replaces the process


def cmd_companion(args) -> int:
    action = getattr(args, "companion_action", None) or "list"
    try:
        if action == "list":
            return list_companions()
        if action == "connect-weixin":
            return connect_weixin(args.companion)
        if action == "run":
            return run_companion(args.companion)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    print(f"Unknown companion action: {action}", file=sys.stderr)
    return 1
