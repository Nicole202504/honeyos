"""Live, project-local overrides for the React companion interface.

The gateway resolves these files for every request, so changing an override is
visible after a browser refresh and never requires a process restart.  Keeping
the editable layer under HoneyOS Projects also lets the companion use its
normal project file tools instead of requesting access to the installed app.
"""

from __future__ import annotations

from pathlib import Path

from honeyos.companion.projects import project_root


WEB_OVERRIDE_DIR = "HoneyOS UI"
REACT_WEB_OVERRIDE_DIR = "react_dist"


def companion_react_override_root() -> Path:
    """Return the last-known-good React build override directory."""

    return project_root() / WEB_OVERRIDE_DIR / REACT_WEB_OVERRIDE_DIR


def companion_avatar_path() -> Path:
    """Return the stable, agent-editable companion avatar file."""

    return project_root() / WEB_OVERRIDE_DIR / "avatars" / "companion-avatar"


def resolve_companion_react_asset(bundled_root: Path, asset_path: str) -> Path:
    """Resolve a safe React build asset, preferring the local built override."""

    relative = Path(asset_path)
    if relative.is_absolute() or ".." in relative.parts:
        return bundled_root / "__missing__"
    override_root = companion_react_override_root().resolve()
    bundled_root = bundled_root.resolve()
    override = (override_root / relative).resolve()
    bundled = (bundled_root / relative).resolve()
    try:
        override.relative_to(override_root)
        bundled.relative_to(bundled_root)
    except (OSError, RuntimeError, ValueError):
        return bundled_root / "__missing__"
    return override if override.is_file() else bundled
