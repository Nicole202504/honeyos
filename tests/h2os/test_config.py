from __future__ import annotations

import yaml

import h2os_cli.config as config_module
from h2os_cli.config import initialize_home


def test_initialize_home_creates_companion_contract(tmp_path):
    result = initialize_home(tmp_path, platform="weixin")
    config = yaml.safe_load((tmp_path / "config.yaml").read_text(encoding="utf-8"))

    assert config["agent"]["mode"] == "companion"
    assert config["agent"]["max_turns"] == 8
    assert "max_iterations" not in config["agent"]
    assert config["agent"]["tool_use_enforcement"] is False
    assert config["agent"]["task_completion_guidance"] is False
    assert config["agent"]["parallel_tool_call_guidance"] is False
    assert config["agent"]["environment_probe"] is False
    assert hasattr(config_module, "COMPANION_TOOLSETS")
    assert config["platform_toolsets"]["weixin"] == list(
        config_module.COMPANION_TOOLSETS
    )
    assert config["platform_toolsets"]["weixin"] == [
        "memory",
        "session_search",
        "web",
        "browser",
        "file",
        "code_execution",
        "terminal",
        "skills",
    ]
    assert config["web"]["backend"] == "ddgs"
    assert config["terminal"]["backend"] == "docker"
    assert config["terminal"]["docker_mount_cwd_to_workspace"] is False
    assert config["terminal"]["docker_volumes"] == []
    assert config["terminal"]["docker_forward_env"] == []
    assert config["terminal"]["env_passthrough"] == []
    assert config["approvals"]["mode"] == "off"
    assert config["security"]["allow_proxy_fake_ips"] is True
    assert config["memory"]["memory_enabled"] is True
    assert config["memory"]["user_profile_enabled"] is True
    assert config["memory"]["nudge_interval"] == 0
    assert config["memory"]["provider"] == ""
    assert config["skills"]["creation_nudge_interval"] == 0
    assert config["mcp_servers"] == {}
    assert config["platforms"]["weixin"]["extra"]["dm_policy"] == "pairing"
    assert config["platforms"]["weixin"]["extra"]["group_policy"] == "disabled"
    assert (tmp_path / ".no-bundled-skills").exists()
    assert "私人 AI 伴侣" in (tmp_path / "SOUL.md").read_text(encoding="utf-8")
    assert (tmp_path / "memories" / "USER.md").exists()
    assert (tmp_path / "memories" / "MEMORY.md").exists()
    assert result.home == tmp_path.resolve()


def test_initialize_home_is_idempotent_and_preserves_user_owned_files(tmp_path):
    initialize_home(tmp_path)
    (tmp_path / "SOUL.md").write_text("user-owned-soul", encoding="utf-8")
    (tmp_path / "config.yaml").write_text("user_owned: true\n", encoding="utf-8")
    (tmp_path / "memories" / "USER.md").write_text(
        "user-owned-memory", encoding="utf-8"
    )

    second = initialize_home(tmp_path)

    assert (tmp_path / "SOUL.md").read_text(encoding="utf-8") == "user-owned-soul"
    assert (tmp_path / "config.yaml").read_text(encoding="utf-8") == "user_owned: true\n"
    assert (
        tmp_path / "memories" / "USER.md"
    ).read_text(encoding="utf-8") == "user-owned-memory"
    assert second.created == ()


def test_initialize_home_rejects_unsupported_platform(tmp_path):
    try:
        initialize_home(tmp_path, platform="telegram")
    except ValueError as exc:
        assert "weixin" in str(exc)
    else:
        raise AssertionError("unsupported platform was accepted")


def test_upgrade_companion_capabilities_is_idempotent_and_preserves_user_state(tmp_path):
    initialize_home(tmp_path)
    config_path = tmp_path / "config.yaml"
    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    config["providers"] = {"user-provider": {"base_url": "https://example.test/v1"}}
    config["user_owned"] = {"keep": True}
    config["platform_toolsets"]["weixin"] = ["memory", "session_search"]
    config["terminal"]["backend"] = "local"
    config_path.write_text(
        yaml.safe_dump(config, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    soul_path = tmp_path / "SOUL.md"
    soul_path.write_text("# My formed identity\n\nKeep me.\n", encoding="utf-8")

    assert hasattr(config_module, "upgrade_companion_capabilities")
    changed = config_module.upgrade_companion_capabilities(tmp_path)
    first_config = config_path.read_text(encoding="utf-8")
    first_soul = soul_path.read_text(encoding="utf-8")
    changed_again = config_module.upgrade_companion_capabilities(tmp_path)

    migrated = yaml.safe_load(first_config)
    assert changed is True
    assert changed_again is False
    assert config_path.read_text(encoding="utf-8") == first_config
    assert soul_path.read_text(encoding="utf-8") == first_soul
    assert migrated["providers"] == config["providers"]
    assert migrated["user_owned"] == {"keep": True}
    assert migrated["platform_toolsets"]["weixin"] == list(
        config_module.COMPANION_TOOLSETS
    )
    assert migrated["terminal"]["backend"] == "docker"
    assert migrated["security"]["allow_proxy_fake_ips"] is True
    assert first_soul.startswith("# My formed identity")
    assert first_soul.count("# Capability Growth") == 1
