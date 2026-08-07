from __future__ import annotations

import yaml

from h2os_cli.bootstrap import activate_h2os_home
from h2os_cli.config import initialize_home
from h2os_cli.setup import ModelChoice, configure_model, run_setup


def test_configure_model_keeps_key_out_of_yaml(tmp_path):
    initialize_home(tmp_path)
    choice = ModelChoice(
        provider="openrouter",
        model="z-ai/glm-5.2",
        base_url="https://openrouter.ai/api/v1",
        key_env="OPENROUTER_API_KEY",
    )

    configure_model(tmp_path, choice, "secret-value")

    config_text = (tmp_path / "config.yaml").read_text(encoding="utf-8")
    config = yaml.safe_load(config_text)
    assert config["model"] == {
        "default": "z-ai/glm-5.2",
        "provider": "openrouter",
        "base_url": "https://openrouter.ai/api/v1",
        "api_mode": "chat_completions",
    }
    assert "secret-value" not in config_text
    assert "OPENROUTER_API_KEY=secret-value" in (
        tmp_path / ".env"
    ).read_text(encoding="utf-8")


def test_custom_model_uses_named_provider_key_env_at_runtime(monkeypatch, tmp_path):
    initialize_home(tmp_path)
    activate_h2os_home(tmp_path)
    choice = ModelChoice(
        provider="custom",
        model="deepseek-v4-flash",
        base_url="https://api.example.com/v1",
        key_env="H2OS_MODEL_API_KEY",
    )
    configure_model(tmp_path, choice, "secret-value")
    monkeypatch.setenv("H2OS_MODEL_API_KEY", "secret-value")

    from hermes_cli.runtime_provider import resolve_runtime_provider

    runtime = resolve_runtime_provider(requested="h2os-model")

    assert runtime["provider"] == "custom"
    assert runtime["base_url"] == "https://api.example.com/v1"
    assert runtime["api_key"] == "secret-value"
    assert runtime["model"] == "deepseek-v4-flash"


def test_setup_orders_key_validation_before_weixin_and_start(tmp_path):
    initialize_home(tmp_path)
    events = []
    answers = iter(["", "https://api.example.com/v1", "test-model"])

    result = run_setup(
        tmp_path,
        input_fn=lambda _prompt: next(answers),
        secret_fn=lambda _prompt: "valid-key",
        validate_fn=lambda choice, key: events.append(
            ("validate", choice.provider, key)
        ),
        weixin_setup_fn=lambda home: events.append(("weixin", home)) or 0,
        gateway_run_fn=lambda command, *, home, arguments=(): events.append(
            ("gateway", command, tuple(arguments), home)
        )
        or 0,
    )

    assert result == 0
    assert events == [
        ("validate", "custom", "valid-key"),
        ("weixin", tmp_path.resolve()),
        ("gateway", "install", ("--no-start-now",), tmp_path.resolve()),
        ("gateway", "start", (), tmp_path.resolve()),
    ]


def test_setup_stops_before_weixin_when_key_validation_fails(tmp_path, capsys):
    initialize_home(tmp_path)
    events = []
    answers = iter(["", "https://api.example.com/v1", "test-model"])

    result = run_setup(
        tmp_path,
        input_fn=lambda _prompt: next(answers),
        secret_fn=lambda _prompt: "bad-key",
        validate_fn=lambda _choice, _key: (_ for _ in ()).throw(
            ValueError("API Key 无效")
        ),
        weixin_setup_fn=lambda home: events.append(home) or 0,
        gateway_run_fn=lambda command, *, home, arguments=(): 0,
    )

    assert result == 1
    assert events == []
    assert "API Key 无效" in capsys.readouterr().err
