"""Curated H2OS capability shelf; the broad Hermes hub stays hidden."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Capability:
    id: str
    name: str
    description: str
    status: str
    skill_identifier: str | None = None
    required_tools: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()


CATALOG = (
    Capability(
        id="relationship-reminder",
        name="纪念日与提醒",
        description="记住双方约定，并在约定时间回到原聊天提醒你。",
        status="available",
        skill_identifier="springbrand/h2os-skills/skills/relationship-reminder",
        required_tools=("cronjob", "memory"),
        permissions=("写入长期记忆", "主动发送提醒"),
    ),
    Capability(
        id="proactive-contact",
        name="主动联系",
        description="让伴侣在合适时机主动联系你。",
        status="coming_soon",
    ),
    Capability(
        id="watch-together",
        name="一起看电影",
        description="围绕同一部影片保持共同观看上下文。",
        status="coming_soon",
    ),
)


def get_capability(capability_id: str) -> Capability:
    for capability in CATALOG:
        if capability.id == capability_id:
            return capability
    raise KeyError(capability_id)


def catalog_for_profile(profile_home: Path) -> list[dict]:
    installed = {
        child.name
        for child in (Path(profile_home) / "skills").iterdir()
        if child.is_dir()
    } if (Path(profile_home) / "skills").is_dir() else set()
    result = []
    for capability in CATALOG:
        row = asdict(capability)
        row["installed"] = capability.id in installed
        result.append(row)
    return result
