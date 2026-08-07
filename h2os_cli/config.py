"""Generate the minimal, single-companion H2OS home contract."""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

import yaml


_SUPPORTED_PLATFORMS = frozenset({"weixin"})

COMPANION_TOOLSETS = (
    "memory",
    "session_search",
    "web",
    "browser",
    "file",
    "code_execution",
    "terminal",
    "skills",
)


@dataclass(frozen=True)
class InitResult:
    home: Path
    created: tuple[Path, ...]


def _atomic_replace(path: Path, content: str, *, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
        os.chmod(temporary_name, mode)
        os.replace(temporary_name, path)
    finally:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass


def companion_config(platform: str = "weixin") -> dict:
    """Return the deterministic MVP configuration for *platform*."""

    normalized = platform.strip().lower()
    if normalized not in _SUPPORTED_PLATFORMS:
        raise ValueError("H2OS v0.1 supports the weixin platform only")

    return {
        "agent": {
            "mode": "companion",
            "max_turns": 8,
            "tool_use_enforcement": False,
            "task_completion_guidance": False,
            "parallel_tool_call_guidance": False,
            "environment_probe": False,
        },
        "memory": {
            "memory_enabled": True,
            "user_profile_enabled": True,
            "nudge_interval": 0,
            "write_approval": False,
            "provider": "",
        },
        "skills": {"creation_nudge_interval": 0},
        "compression": {"enabled": True, "in_place": True},
        "platform_toolsets": {normalized: list(COMPANION_TOOLSETS)},
        "web": {
            "backend": "ddgs",
        },
        "terminal": {
            "backend": "docker",
            "cwd": ".",
            "docker_mount_cwd_to_workspace": False,
            "docker_volumes": [],
            "docker_forward_env": [],
            "env_passthrough": [],
            "docker_network": True,
            "container_cpu": 1,
            "container_memory": 2048,
            "container_disk": 10240,
            "container_persistent": True,
        },
        "approvals": {"mode": "off"},
        "security": {"allow_proxy_fake_ips": True},
        "platforms": {
            normalized: {
                "extra": {
                    "dm_policy": "pairing",
                    "group_policy": "disabled",
                }
            }
        },
        "mcp_servers": {},
        "display": {"memory_notifications": "off"},
    }


def _create_file(path: Path, content: str, *, mode: int | None = None) -> bool:
    """Create *path* exactly once, preserving any existing user-owned file."""

    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode or 0o644)
    except FileExistsError:
        return False
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(content)
    return True


def initialize_home(home: Path, *, platform: str = "weixin") -> InitResult:
    """Create a safe H2OS home without overwriting user-owned state."""

    resolved = home.expanduser().resolve()
    resolved.mkdir(parents=True, exist_ok=True)
    for directory in ("memories", "sessions", "logs", "skills", "sandboxes"):
        (resolved / directory).mkdir(parents=True, exist_ok=True)

    template = (
        Path(__file__).parent / "templates" / "companion_soul.md"
    ).read_text(encoding="utf-8")
    generated_config = yaml.safe_dump(
        companion_config(platform),
        allow_unicode=True,
        sort_keys=False,
    )

    candidates = (
        (resolved / "config.yaml", generated_config, 0o600),
        (resolved / ".env", "", 0o600),
        (resolved / "SOUL.md", template, 0o644),
        (resolved / "memories" / "USER.md", "", 0o600),
        (resolved / "memories" / "MEMORY.md", "", 0o600),
        (
            resolved / ".no-bundled-skills",
            "Managed by H2OS. Bundled Hermes skills are disabled.\n",
            0o644,
        ),
    )
    created = tuple(
        path for path, content, mode in candidates if _create_file(path, content, mode=mode)
    )
    return InitResult(home=resolved, created=created)


def upgrade_companion_capabilities(home: Path) -> bool:
    """Migrate an existing H2OS home to the controlled growth policy."""

    resolved = home.expanduser().resolve()
    config_path = resolved / "config.yaml"
    config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    if not isinstance(config, dict):
        raise ValueError("config.yaml must contain a mapping")
    original_config = yaml.safe_dump(config, allow_unicode=True, sort_keys=False)

    platform_toolsets = config.setdefault("platform_toolsets", {})
    if not isinstance(platform_toolsets, dict):
        platform_toolsets = {}
        config["platform_toolsets"] = platform_toolsets
    platform_toolsets["weixin"] = list(COMPANION_TOOLSETS)

    web = config.setdefault("web", {})
    if not isinstance(web, dict):
        web = {}
        config["web"] = web
    web.setdefault("backend", "ddgs")

    terminal = config.setdefault("terminal", {})
    if not isinstance(terminal, dict):
        terminal = {}
        config["terminal"] = terminal
    terminal.update(
        {
            "backend": "docker",
            "cwd": ".",
            "docker_mount_cwd_to_workspace": False,
            "docker_volumes": [],
            "docker_forward_env": [],
            "env_passthrough": [],
            "docker_network": True,
            "container_cpu": 1,
            "container_memory": 2048,
            "container_disk": 10240,
            "container_persistent": True,
        }
    )
    approvals = config.setdefault("approvals", {})
    if not isinstance(approvals, dict):
        approvals = {}
        config["approvals"] = approvals
    approvals["mode"] = "off"

    security = config.setdefault("security", {})
    if not isinstance(security, dict):
        security = {}
        config["security"] = security
    security["allow_proxy_fake_ips"] = True

    rendered_config = yaml.safe_dump(config, allow_unicode=True, sort_keys=False)
    changed = rendered_config != original_config
    if changed:
        _atomic_replace(config_path, rendered_config, mode=0o600)

    for directory in ("skills", "sandboxes"):
        (resolved / directory).mkdir(parents=True, exist_ok=True)

    soul_path = resolved / "SOUL.md"
    soul = soul_path.read_text(encoding="utf-8") if soul_path.exists() else ""
    if "# Capability Growth" not in soul:
        template = (
            Path(__file__).parent / "templates" / "companion_soul.md"
        ).read_text(encoding="utf-8")
        _heading, _separator, growth = template.partition("# Capability Growth")
        addition = "# Capability Growth" + growth
        updated_soul = soul.rstrip() + "\n\n" + addition.strip() + "\n"
        _atomic_replace(soul_path, updated_soul, mode=0o644)
        changed = True

    return changed
