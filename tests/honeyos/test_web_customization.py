from pathlib import Path


def test_web_override_prefers_project_file(tmp_path, monkeypatch):
    from honeyos.companion.web_customization import resolve_companion_web_asset

    projects = tmp_path / "HoneyOS Projects"
    monkeypatch.setenv("HONEYOS_PROJECTS_HOME", str(projects))
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    (bundled / "styles.css").write_text("bundled", encoding="utf-8")
    override = projects / "HoneyOS UI" / "web_assets" / "styles.css"
    override.parent.mkdir(parents=True)
    override.write_text("custom", encoding="utf-8")

    assert resolve_companion_web_asset(bundled, "styles.css") == override.resolve()


def test_web_override_falls_back_when_missing_or_unknown(tmp_path, monkeypatch):
    from honeyos.companion.web_customization import resolve_companion_web_asset

    monkeypatch.setenv("HONEYOS_PROJECTS_HOME", str(tmp_path / "projects"))
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    expected = bundled / "app.js"
    expected.write_text("bundled", encoding="utf-8")

    assert resolve_companion_web_asset(bundled, "app.js") == expected
    assert resolve_companion_web_asset(bundled, "secret.txt") == bundled / "secret.txt"


def test_api_server_resolves_live_web_override(tmp_path, monkeypatch):
    from honeyos.gateway.platforms.api_server import APIServerAdapter

    projects = tmp_path / "projects"
    monkeypatch.setenv("HONEYOS_PROJECTS_HOME", str(projects))
    override = projects / "HoneyOS UI" / "web_assets" / "app.js"
    override.parent.mkdir(parents=True)
    override.write_text("custom", encoding="utf-8")

    assert APIServerAdapter._companion_asset_path("app.js") == override.resolve()


def test_react_override_prefers_safe_built_asset(tmp_path, monkeypatch):
    from honeyos.companion.web_customization import resolve_companion_react_asset

    projects = tmp_path / "projects"
    monkeypatch.setenv("HONEYOS_PROJECTS_HOME", str(projects))
    bundled = tmp_path / "bundled"
    bundled.mkdir()
    (bundled / "index.html").write_text("bundled", encoding="utf-8")
    override = projects / "HoneyOS UI" / "react_dist" / "index.html"
    override.parent.mkdir(parents=True)
    override.write_text("custom", encoding="utf-8")

    assert resolve_companion_react_asset(bundled, "index.html") == override.resolve()
    assert resolve_companion_react_asset(bundled, "../secret.txt").name == "__missing__"
