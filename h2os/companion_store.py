"""Atomic, profile-local persistence for ``companion.json`` and avatars."""

from __future__ import annotations

import base64
import binascii
import json
from pathlib import Path
from typing import Iterable, Optional

from utils import atomic_write_text

from .companion_models import CompanionMetadata


COMPANION_FILENAME = "companion.json"
MAX_AVATAR_BYTES = 5 * 1024 * 1024
_AVATAR_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class CompanionStore:
    def path_for(self, profile_home: Path) -> Path:
        return Path(profile_home) / COMPANION_FILENAME

    def save(self, profile_home: Path, companion: CompanionMetadata) -> None:
        payload = companion.model_dump(mode="json", exclude_none=True)
        atomic_write_text(
            self.path_for(profile_home),
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            preserve_mode=True,
            create_mode=0o600,
        )

    def load(self, profile_home: Path) -> CompanionMetadata:
        path = self.path_for(profile_home)
        if not path.is_file():
            raise FileNotFoundError(f"No companion metadata at {path}")
        return CompanionMetadata.model_validate_json(path.read_text(encoding="utf-8"))

    def list(self, profile_homes: Iterable[Path]) -> list[CompanionMetadata]:
        companions: list[CompanionMetadata] = []
        for profile_home in profile_homes:
            try:
                companions.append(self.load(profile_home))
            except (FileNotFoundError, OSError, ValueError):
                continue
        return sorted(companions, key=lambda item: item.created_at, reverse=True)

    def save_avatar(self, profile_home: Path, data_url: Optional[str]) -> Optional[str]:
        if not data_url:
            return None
        try:
            header, encoded = data_url.split(",", 1)
            mime = (
                header[5:].split(";", 1)[0].lower()
                if header.startswith("data:")
                else ""
            )
            if ";base64" not in header or mime not in _AVATAR_TYPES:
                raise ValueError(
                    "avatar must be a base64 PNG, JPEG, WebP, or GIF data URL"
                )
            raw = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as exc:
            if isinstance(exc, ValueError) and str(exc).startswith("avatar"):
                raise
            raise ValueError("avatar_data_url is not valid base64") from exc
        if len(raw) > MAX_AVATAR_BYTES:
            raise ValueError("avatar must be 5 MB or smaller")
        asset_dir = Path(profile_home) / "assets"
        target = asset_dir / f"avatar{_AVATAR_TYPES[mime]}"
        asset_dir.mkdir(parents=True, exist_ok=True)
        # Avatars are public presentation data, but still use an atomic replace.
        from tempfile import NamedTemporaryFile
        from utils import atomic_replace

        with NamedTemporaryFile(dir=asset_dir, prefix=".avatar_", delete=False) as handle:
            handle.write(raw)
            handle.flush()
            temp_name = handle.name
        atomic_replace(temp_name, target)
        return target.relative_to(profile_home).as_posix()
