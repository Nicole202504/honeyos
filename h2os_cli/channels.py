"""H2OS-branded wrappers around inherited messaging adapters."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from h2os_cli import PRODUCT_NAME
from h2os_cli.bootstrap import activate_h2os_home


def setup_weixin(home: Path) -> int:
    """Connect one scanner to one private H2OS instance via Weixin QR login."""

    resolved = activate_h2os_home(home)
    print(f"{PRODUCT_NAME} 微信连接 · 数据只保存在 {resolved}")
    print("请用微信扫描终端中的二维码，并在手机上确认。")
    try:
        from gateway.platforms.weixin import check_weixin_requirements, qr_login
        from hermes_cli.config import save_env_value

        if not check_weixin_requirements():
            raise RuntimeError("缺少微信连接依赖，请重新运行安装程序")
        credentials = asyncio.run(qr_login(str(resolved)))
        if not credentials:
            raise RuntimeError("微信扫码没有完成，请重新运行安装程序")

        account_id = str(credentials.get("account_id") or "").strip()
        token = str(credentials.get("token") or "").strip()
        base_url = str(credentials.get("base_url") or "").strip()
        user_id = str(credentials.get("user_id") or "").strip()
        if not account_id or not token:
            raise RuntimeError("微信没有返回完整的登录凭据，请重新扫码")
        if not user_id:
            raise RuntimeError("无法识别扫码用户，不能安全地自动绑定本人")

        save_env_value("WEIXIN_ACCOUNT_ID", account_id)
        save_env_value("WEIXIN_TOKEN", token)
        if base_url:
            save_env_value("WEIXIN_BASE_URL", base_url)
        save_env_value(
            "WEIXIN_CDN_BASE_URL", "https://novac2c.cdn.weixin.qq.com/c2c"
        )
        save_env_value("WEIXIN_DM_POLICY", "allowlist")
        save_env_value("WEIXIN_ALLOW_ALL_USERS", "false")
        save_env_value("WEIXIN_ALLOWED_USERS", user_id)
        save_env_value("WEIXIN_GROUP_POLICY", "disabled")
        save_env_value("WEIXIN_GROUP_ALLOWED_USERS", "")
        save_env_value("WEIXIN_HOME_CHANNEL", user_id)
    except KeyboardInterrupt:
        print(f"{PRODUCT_NAME} 微信连接已取消。", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"{PRODUCT_NAME} 微信连接失败：{exc}", file=sys.stderr)
        return 1
    print("✓ 微信已连接，并且只允许扫码本人私聊；群聊默认关闭。")
    return 0
