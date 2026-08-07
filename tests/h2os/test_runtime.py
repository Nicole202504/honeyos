from __future__ import annotations

import json
import sys

from h2os_cli.runtime import (
    UPSTREAM_COMMIT,
    gateway_argv,
    write_runtime_identity,
)


def test_gateway_argv_uses_current_python_not_path_hermes():
    argv = gateway_argv("status")

    assert argv[:3] == [sys.executable, "-m", "hermes_cli.main"]
    assert argv[3:] == ["gateway", "status"]
    assert "hermes" not in argv


def test_write_runtime_identity_contains_no_secrets(tmp_path):
    identity = write_runtime_identity(tmp_path)
    payload = json.loads((tmp_path / "runtime.json").read_text(encoding="utf-8"))

    assert identity.upstream_commit == UPSTREAM_COMMIT
    assert payload["python_executable"] == sys.executable
    assert payload["data_directory"] == str(tmp_path.resolve())
    assert payload["upstream_commit"] == UPSTREAM_COMMIT
    assert "api_key" not in json.dumps(payload).lower()
    assert "token" not in json.dumps(payload).lower()

