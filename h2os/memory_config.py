"""Companion-specific built-in memory defaults and initial memory files."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

from utils import atomic_write_text

from .companion_models import CompanionCreate


MEMORY_DEFAULTS = {
    "memory_enabled": True,
    "user_profile_enabled": True,
    "memory_char_limit": 2200,
    "user_char_limit": 1375,
    "nudge_interval": 3,
    "write_approval": False,
}


def apply_memory_defaults(config: dict) -> dict:
    memory = config.setdefault("memory", {})
    if not isinstance(memory, dict):
        memory = {}
        config["memory"] = memory
    memory.update(MEMORY_DEFAULTS)
    display = config.setdefault("display", {})
    if not isinstance(display, dict):
        display = {}
        config["display"] = display
    display["memory_notifications"] = "on"
    return config


def seed_initial_memory(
    profile_home: Path, request: CompanionCreate, created_at: datetime
) -> None:
    memory_dir = Path(profile_home) / "memories"
    user_lines = ["# User"]
    if request.user_name:
        user_lines.append(f"- 用户希望被称为：{request.user_name}")
    if request.timezone:
        user_lines.append(f"- 用户时区：{request.timezone}")
    user_lines.extend(f"- 明确偏好：{item}" for item in request.user_preferences)
    user_lines.append(f"- 明确边界：{request.boundaries or '尚未设置'}")

    memory_lines = [
        "# Shared Memory",
        f"- {request.display_name} 于 {created_at.date().isoformat()} 被创建。",
        f"- 双方关系起点：{request.relationship_type}。",
    ]
    memory_lines.extend(f"- 未完成约定：{item}" for item in request.initial_commitments)

    atomic_write_text(memory_dir / "USER.md", "\n".join(user_lines) + "\n", create_mode=0o600)
    atomic_write_text(
        memory_dir / "MEMORY.md", "\n".join(memory_lines) + "\n", create_mode=0o600
    )
