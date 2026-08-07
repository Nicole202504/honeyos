from __future__ import annotations

from hermes_cli.gateway import (
    _service_product_name,
    generate_launchd_plist,
    generate_systemd_unit,
    get_launchd_label,
    get_service_name,
)


def test_h2os_uses_distinct_background_service_identity(monkeypatch, tmp_path):
    monkeypatch.setenv("H2OS_RUNTIME_ID", "h2os-companion-v0.2")
    monkeypatch.setenv("H2OS_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))

    assert get_service_name() == "h2os-gateway"
    assert get_launchd_label() == "ai.springbrand.h2os"
    assert _service_product_name() == "H2OS"


def test_h2os_service_definitions_preserve_runtime_identity(monkeypatch, tmp_path):
    monkeypatch.setenv("H2OS_RUNTIME_ID", "h2os-companion-v0.2")
    monkeypatch.setenv("H2OS_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))

    systemd = generate_systemd_unit()
    launchd = generate_launchd_plist()

    assert "Description=H2OS Companion Gateway" in systemd
    assert f'Environment="H2OS_HOME={tmp_path.resolve()}"' in systemd
    assert 'Environment="H2OS_RUNTIME_ID=h2os-companion-v0.2"' in systemd
    assert "<string>ai.springbrand.h2os</string>" in launchd
    assert "<key>H2OS_HOME</key>" in launchd
    assert "<key>H2OS_RUNTIME_ID</key>" in launchd
