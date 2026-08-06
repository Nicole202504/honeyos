"""Behavior contracts for H2OS companion provisioning."""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

from h2os.companion_models import CompanionCreate, CompanionIdentityUpdate
from h2os.companion_store import CompanionStore
from h2os.profile_orchestrator import ProfileOrchestrator


@pytest.fixture()
def profile_env(tmp_path, monkeypatch) -> Path:
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    home = tmp_path / ".hermes"
    home.mkdir()
    monkeypatch.setenv("HERMES_HOME", str(home))
    monkeypatch.setattr(
        "h2os.profile_orchestrator.provider_catalog_by_slug",
        lambda: {
            "openrouter": SimpleNamespace(api_key_env_vars=("OPENROUTER_API_KEY",)),
            "openai-codex": SimpleNamespace(api_key_env_vars=()),
        },
    )
    return home


def request(**overrides) -> CompanionCreate:
    data = {
        "display_name": "Luna",
        "relationship_type": "伴侣",
        "personality": "温柔、独立、有自己的判断",
        "communication_style": "像微信联系人，回复自然简洁",
        "boundaries": "不替用户做医疗和金融决策",
        "advanced_system_prompt": "不要假装拥有身体。",
        "provider": "openrouter",
        "model": "anthropic/claude-sonnet-4.6",
        "api_key": "sk-test-secret",
        "user_name": "小林",
        "timezone": "Asia/Shanghai",
        "user_preferences": ["不喜欢长篇回复"],
        "initial_commitments": ["周五一起看电影"],
    }
    data.update(overrides)
    return CompanionCreate(**data)


def test_create_provisions_isolated_profile_without_leaking_secret(profile_env: Path):
    companion = ProfileOrchestrator().create(request())
    profile_home = profile_env / "profiles" / companion.profile_name

    assert companion.companion_id.startswith("cmp_")
    assert companion.setup_status == "needs_channel"
    assert (profile_home / ".no-bundled-skills").is_file()

    metadata_text = (profile_home / "companion.json").read_text(encoding="utf-8")
    config_text = (profile_home / "config.yaml").read_text(encoding="utf-8")
    assert "sk-test-secret" not in metadata_text
    assert "sk-test-secret" not in config_text
    assert "OPENROUTER_API_KEY=sk-test-secret" in (
        profile_home / ".env"
    ).read_text(encoding="utf-8")

    raw_config = yaml.safe_load(config_text)
    assert raw_config["model"]["provider"] == "openrouter"
    assert raw_config["model"]["default"] == "anthropic/claude-sonnet-4.6"
    # save_config intentionally omits values equal to Hermes defaults. Verify
    # the merged runtime view rather than requiring duplicate YAML literals.
    from hermes_constants import reset_hermes_home_override, set_hermes_home_override
    from hermes_cli.config import load_config

    token = set_hermes_home_override(str(profile_home))
    try:
        config = load_config()
    finally:
        reset_hermes_home_override(token)
    assert config["memory"]["memory_enabled"] is True
    assert config["memory"]["user_profile_enabled"] is True
    assert config["memory"]["nudge_interval"] == 3

    soul = (profile_home / "SOUL.md").read_text(encoding="utf-8")
    assert "你的名字是 Luna" in soul
    assert "不要假装拥有身体" in soul
    user = (profile_home / "memories" / "USER.md").read_text(encoding="utf-8")
    memory = (profile_home / "memories" / "MEMORY.md").read_text(encoding="utf-8")
    assert "不喜欢长篇回复" in user
    assert "周五一起看电影" in memory


def test_post_profile_failure_keeps_recoverable_error_state(profile_env: Path, monkeypatch):
    monkeypatch.setattr(
        CompanionStore,
        "save_avatar",
        lambda *args, **kwargs: (_ for _ in ()).throw(OSError("disk full")),
    )

    with pytest.raises(OSError, match="disk full"):
        ProfileOrchestrator().create(request(api_key=None))

    profile_homes = list((profile_env / "profiles").iterdir())
    assert len(profile_homes) == 1
    metadata = json.loads(
        (profile_homes[0] / "companion.json").read_text(encoding="utf-8")
    )
    assert metadata["setup_status"] == "error"
    assert metadata["setup_step"] == "avatar"
    assert "disk full" in metadata["setup_error"]


def test_identity_update_rewrites_soul_but_preserves_companion_id(profile_env: Path):
    orchestrator = ProfileOrchestrator()
    companion = orchestrator.create(request(api_key=None))
    profile_home = profile_env / "profiles" / companion.profile_name

    updated = orchestrator.update_identity(
        profile_home,
        companion,
        CompanionIdentityUpdate(
            display_name="Luna 2",
            relationship_type="知己",
            personality="冷静而坦率",
            communication_style="短句",
            boundaries="不虚构事实",
            advanced_system_prompt="称呼用户为小林。",
        ),
    )

    assert updated.companion_id == companion.companion_id
    assert updated.display_name == "Luna 2"
    soul = (profile_home / "SOUL.md").read_text(encoding="utf-8")
    assert "你的名字是 Luna 2" in soul
    assert "你和用户当前的关系是：知己" in soul


def test_provider_without_key_auth_rejects_pasted_secret(profile_env: Path):
    with pytest.raises(ValueError, match="does not accept an API key"):
        ProfileOrchestrator().create(
            request(provider="openai-codex", model="gpt-5", api_key="not-valid-here")
        )
    assert not (profile_env / "profiles").exists()


def test_companion_api_creates_and_reads_by_stable_id(profile_env: Path):
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient
    from hermes_cli.web_routers.h2os_companions import router

    app = fastapi.FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        response = client.post(
            "/api/h2os/companions",
            json=request().model_dump(mode="json"),
        )
        assert response.status_code == 201, response.text
        created = response.json()
        assert "api_key" not in created

        detail = client.get(f"/api/h2os/companions/{created['companion_id']}")
        assert detail.status_code == 200, detail.text
        assert detail.json()["display_name"] == "Luna"

        runtime = client.get(
            f"/api/h2os/companions/{created['companion_id']}/runtime"
        )
        assert runtime.status_code == 200, runtime.text
        assert runtime.json()["profile_name"] == created["profile_name"]
        assert "gateway run" in runtime.json()["terminal_command"]

        listing = client.get("/api/h2os/companions")
        assert listing.status_code == 200, listing.text
        assert [item["companion_id"] for item in listing.json()["companions"]] == [
            created["companion_id"]
        ]


def test_companion_weixin_qr_api_never_returns_credentials(
    profile_env: Path, monkeypatch
):
    fastapi = pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient
    from hermes_cli.web_routers import h2os_companions as routes

    companion = ProfileOrchestrator().create(request(api_key=None))
    captured = {}

    class FakeOnboarding:
        def __init__(self, hermes_home: str):
            captured["home"] = hermes_home

        async def start(self):
            return SimpleNamespace(
                qr_content="weixin://scan-me",
                expires_at=9999999999,
            )

        async def poll(self, _state):
            return {
                "status": "confirmed",
                "credentials": {
                    "account_id": "bot-1",
                    "token": "never-return-this-token",
                    "base_url": "https://weixin.example.com",
                    "user_id": "user-1",
                },
            }

    def fake_finish(session, credentials):
        captured["credentials"] = credentials
        return {
            "companion": companion,
            "gateway_restart_started": True,
        }

    monkeypatch.setattr(routes, "check_weixin_requirements", lambda: True)
    monkeypatch.setattr(routes, "WeixinQrOnboarding", FakeOnboarding)
    monkeypatch.setattr(routes, "_finish_weixin_setup", fake_finish)
    routes._weixin_sessions.clear()

    app = fastapi.FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as client:
        started = client.post(
            f"/api/h2os/companions/{companion.companion_id}/channels/weixin/start"
        )
        assert started.status_code == 200, started.text
        body = started.json()
        assert body["qr_content"] == "weixin://scan-me"
        assert "token" not in started.text

        status = client.get(
            f"/api/h2os/companions/{companion.companion_id}/channels/weixin/status",
            params={"request_id": body["request_id"]},
        )
        assert status.status_code == 200, status.text
        assert status.json()["status"] == "confirmed"
        assert "never-return-this-token" not in status.text
        assert captured["credentials"]["token"] == "never-return-this-token"


def test_weixin_confirmation_configures_only_the_companion_profile(
    profile_env: Path, monkeypatch
):
    from hermes_cli import web_deps
    from hermes_cli.web_routers import h2os_companions as routes

    companion = ProfileOrchestrator().create(request(api_key=None))
    profile_home = profile_env / "profiles" / companion.profile_name
    service = SimpleNamespace()
    session = routes._WeixinSession(
        request_id="request-1",
        companion_id=companion.companion_id,
        profile_name=companion.profile_name,
        profile_home=profile_home,
        service=service,
        state=SimpleNamespace(qr_content="qr", expires_at=9999999999),
        expires_at=9999999999,
    )
    called = {}

    def fake_late(name):
        assert name == "_spawn_gateway_restart"

        def restart(profile):
            called["profile"] = profile
            return SimpleNamespace(pid=4321), False

        return restart

    monkeypatch.setattr(web_deps, "late", fake_late)
    result = routes._finish_weixin_setup(
        session,
        {
            "account_id": "bot-1",
            "token": "profile-only-token",
            "base_url": "https://weixin.example.com",
            "user_id": "user-1",
        },
    )

    env_text = (profile_home / ".env").read_text(encoding="utf-8")
    assert "WEIXIN_TOKEN=profile-only-token" in env_text
    assert "WEIXIN_DM_POLICY=allowlist" in env_text
    assert "WEIXIN_ALLOWED_USERS=user-1" in env_text
    assert "WEIXIN_HOME_CHANNEL=user-1" in env_text
    root_env = profile_env / ".env"
    if root_env.exists():
        assert "profile-only-token" not in root_env.read_text(encoding="utf-8")
    config = yaml.safe_load((profile_home / "config.yaml").read_text(encoding="utf-8"))
    assert config["platforms"]["weixin"]["enabled"] is True
    saved = CompanionStore().load(profile_home)
    assert saved.setup_status == "ready"
    assert saved.channel == "weixin"
    assert called["profile"] == companion.profile_name
    assert result["gateway_restart_pid"] == 4321


def test_terminal_run_uses_companion_profile_gateway(profile_env: Path, monkeypatch):
    from h2os import cli

    companion = ProfileOrchestrator().create(request(api_key=None))
    profile_home = profile_env / "profiles" / companion.profile_name
    companion.channel = "weixin"
    companion.setup_status = "ready"
    CompanionStore().save(profile_home, companion)
    executed = {}

    def fake_execv(executable, argv):
        executed["executable"] = executable
        executed["argv"] = argv
        raise RuntimeError("exec intercepted")

    monkeypatch.setattr(cli.os, "execv", fake_execv)
    with pytest.raises(RuntimeError, match="exec intercepted"):
        cli.run_companion(companion.profile_name)

    assert executed["argv"][3:] == [
        "--profile",
        companion.profile_name,
        "gateway",
        "run",
        "--replace",
    ]
