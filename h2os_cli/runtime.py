"""Runtime identity and absolute-path dispatch for H2OS."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from h2os_cli import __version__


UPSTREAM_COMMIT = "6e9cae6ac4b41b5325d3ef8bdce5ed8e6fd9b28a"
_GATEWAY_COMMANDS = frozenset({"install", "start", "stop", "restart", "status"})


@dataclass(frozen=True)
class RuntimeIdentity:
    h2os_version: str
    upstream_commit: str
    python_executable: str
    repository_root: str
    data_directory: str
    initialized_at: str


def gateway_argv(command: str, arguments: tuple[str, ...] = ()) -> list[str]:
    """Build a gateway command without resolving a ``hermes`` executable."""

    normalized = command.strip().lower()
    if normalized not in _GATEWAY_COMMANDS:
        raise ValueError(f"unsupported gateway command: {command}")
    return [
        sys.executable,
        "-m",
        "hermes_cli.main",
        "gateway",
        normalized,
        *arguments,
    ]


def hermes_module_argv(*arguments: str) -> list[str]:
    """Build an internal Hermes-module invocation using this interpreter."""

    return [sys.executable, "-m", "hermes_cli.main", *arguments]


def write_runtime_identity(home: Path) -> RuntimeIdentity:
    """Persist non-secret build metadata under the H2OS data directory."""

    resolved = home.expanduser().resolve()
    resolved.mkdir(parents=True, exist_ok=True)
    identity = RuntimeIdentity(
        h2os_version=__version__,
        upstream_commit=UPSTREAM_COMMIT,
        python_executable=sys.executable,
        repository_root=str(Path(__file__).resolve().parent.parent),
        data_directory=str(resolved),
        initialized_at=datetime.now(timezone.utc).isoformat(),
    )
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".runtime.", suffix=".json", dir=resolved
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(asdict(identity), handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, resolved / "runtime.json")
    finally:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
    return identity


def run_gateway_command(
    command: str, *, home: Path, arguments: tuple[str, ...] = ()
) -> int:
    """Run a gateway lifecycle command with an explicit H2OS home."""

    resolved = home.expanduser().resolve()
    environment = os.environ.copy()
    environment["H2OS_HOME"] = str(resolved)
    environment["HERMES_HOME"] = str(resolved)
    environment["H2OS_RUNTIME_ID"] = "h2os-companion-v0.1"
    completed = subprocess.run(
        gateway_argv(command, arguments), env=environment, check=False
    )
    return completed.returncode


def run_hermes_module(arguments: list[str], *, home: Path) -> int:
    """Run an internal Hermes CLI operation under the H2OS home."""

    resolved = home.expanduser().resolve()
    environment = os.environ.copy()
    environment["H2OS_HOME"] = str(resolved)
    environment["HERMES_HOME"] = str(resolved)
    environment["H2OS_RUNTIME_ID"] = "h2os-companion-v0.1"
    completed = subprocess.run(
        hermes_module_argv(*arguments), env=environment, check=False
    )
    return completed.returncode
