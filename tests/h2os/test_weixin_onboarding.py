from __future__ import annotations

import os
import sys
from types import SimpleNamespace

from h2os_cli.channels import setup_weixin


def test_weixin_setup_uses_h2os_home_before_adapter_import(monkeypatch, tmp_path):
    observed = []
    fake_gateway = SimpleNamespace(
        _setup_weixin=lambda: observed.append(os.environ["HERMES_HOME"])
    )
    monkeypatch.setitem(sys.modules, "hermes_cli.gateway", fake_gateway)

    assert setup_weixin(tmp_path) == 0
    assert observed == [str(tmp_path.resolve())]
    assert os.environ["H2OS_HOME"] == str(tmp_path.resolve())


def test_weixin_setup_returns_clean_error_without_traceback(
    monkeypatch, tmp_path, capsys
):
    def fail():
        raise RuntimeError("scan failed")

    monkeypatch.setitem(
        sys.modules,
        "hermes_cli.gateway",
        SimpleNamespace(_setup_weixin=fail),
    )

    assert setup_weixin(tmp_path) == 1
    captured = capsys.readouterr()
    assert "scan failed" in captured.err
    assert "Traceback" not in captured.err

