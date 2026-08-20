from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest


NODE = shutil.which("node")
ASSET = (
    Path(__file__).parents[2]
    / "honeyos"
    / "companion"
    / "web_assets"
    / "message-format.js"
)


def _parse_message(message: str) -> list[dict]:
    script = f"""
global.window = global;
require({json.dumps(str(ASSET))});
process.stdout.write(JSON.stringify(HoneyOSMessageFormat.parse({json.dumps(message)})));
"""
    result = subprocess.run(
        [NODE, "-e", script],
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def _display_message(message: str) -> str:
    script = f"""
global.window = global;
require({json.dumps(str(ASSET))});
process.stdout.write(HoneyOSMessageFormat.displayText({json.dumps(message)}));
"""
    result = subprocess.run(
        [NODE, "-e", script],
        check=True,
        text=True,
        capture_output=True,
    )
    return result.stdout


@pytest.mark.skipif(NODE is None, reason="Node.js is not installed")
def test_companion_message_format_parses_markdown_without_raw_markers():
    blocks = _parse_message(
        "看了一下。\n\n---\n\n**relationship-continuity** → 延续我们的关系。"
    )

    assert [block["type"] for block in blocks] == ["paragraph", "hr", "paragraph"]
    assert blocks[2]["inline"][0] == {
        "type": "strong",
        "value": "relationship-continuity",
    }
    assert "**" not in json.dumps(blocks, ensure_ascii=False)


@pytest.mark.skipif(NODE is None, reason="Node.js is not installed")
def test_companion_message_format_treats_html_as_text():
    blocks = _parse_message('<img src=x onerror="alert(1)">')

    assert blocks == [
        {
            "type": "paragraph",
            "inline": [
                {"type": "text", "value": '<img src=x onerror="alert(1)">'},
            ],
        }
    ]


@pytest.mark.skipif(NODE is None, reason="Node.js is not installed")
def test_companion_message_format_hides_image_data_urls():
    source = "图片：data:image/png;base64," + ("Ab12+/" * 120)

    assert _display_message(source) == "图片：[图片数据已隐藏]"


@pytest.mark.skipif(NODE is None, reason="Node.js is not installed")
def test_companion_message_format_hides_raw_long_base64():
    source = "结果：" + ("Ab12+/" * 120)

    assert _display_message(source) == "结果：[过长的数据已隐藏]"


@pytest.mark.skipif(NODE is None, reason="Node.js is not installed")
def test_companion_message_format_hides_extreme_links():
    source = "链接：https://example.com/?payload=" + ("x" * 600)

    assert _display_message(source) == "链接：[过长的链接已隐藏]"
