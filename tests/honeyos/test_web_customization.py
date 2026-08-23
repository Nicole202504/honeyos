from pathlib import Path


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
