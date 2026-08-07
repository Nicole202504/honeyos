"""Early H2OS home selection.

This module intentionally has no Hermes imports.  The public entrypoint calls
``activate_h2os_home`` before importing any home-sensitive runtime module.
"""

from __future__ import annotations

import os
from pathlib import Path


def resolve_h2os_home(explicit: str | None = None) -> Path:
    """Return the absolute data directory for the single H2OS companion."""

    raw = explicit or os.environ.get("H2OS_HOME", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return (Path.home() / ".h2os").resolve()


def activate_h2os_home(home: Path) -> Path:
    """Pin both H2OS and Hermes internals to *home* for this process."""

    resolved = home.expanduser().resolve()
    os.environ["H2OS_HOME"] = str(resolved)
    os.environ["HERMES_HOME"] = str(resolved)
    os.environ["H2OS_RUNTIME_ID"] = "h2os-companion-v0.1"
    return resolved
