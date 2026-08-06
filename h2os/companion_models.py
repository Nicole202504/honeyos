"""Validated request and persistence models for H2OS companions."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


SetupStatus = Literal["provisioning", "needs_channel", "ready", "error"]


class CompanionIdentity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(min_length=1, max_length=80)
    relationship_type: str = Field(default="伴侣", min_length=1, max_length=80)
    personality: str = Field(default="", max_length=4000)
    communication_style: str = Field(default="", max_length=4000)
    boundaries: str = Field(default="", max_length=4000)
    advanced_system_prompt: str = Field(default="", max_length=16000)

    @field_validator(
        "display_name",
        "relationship_type",
        "personality",
        "communication_style",
        "boundaries",
        "advanced_system_prompt",
    )
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class CompanionCreate(CompanionIdentity):
    provider: str = Field(min_length=1, max_length=120)
    model: str = Field(min_length=1, max_length=300)
    api_key: Optional[SecretStr] = None
    avatar_data_url: Optional[str] = None
    user_name: str = Field(default="", max_length=80)
    timezone: str = Field(default="", max_length=100)
    user_preferences: list[str] = Field(default_factory=list, max_length=20)
    initial_commitments: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("provider", "model", "user_name", "timezone")
    @classmethod
    def strip_create_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("user_preferences", "initial_commitments")
    @classmethod
    def clean_items(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value and value.strip()]
        if any(len(value) > 500 for value in cleaned):
            raise ValueError("memory entries must be at most 500 characters")
        return cleaned


class CompanionIdentityUpdate(CompanionIdentity):
    avatar_data_url: Optional[str] = None


class CompanionMetadata(CompanionIdentity):
    schema_version: int = 1
    companion_id: str
    profile_name: str
    avatar: Optional[str] = None
    provider: str
    model: str
    created_at: datetime
    updated_at: datetime
    setup_status: SetupStatus = "provisioning"
    setup_step: str = "profile"
    setup_error: Optional[str] = None
    channel: Optional[str] = None


class CompanionCreateResponse(BaseModel):
    ok: bool = True
    companion_id: str
    profile_name: str
    setup_status: SetupStatus
    next_step: Optional[str] = None
