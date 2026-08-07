"""H2OS-branded wrappers around inherited messaging adapters."""

from __future__ import annotations

import sys
from pathlib import Path

from h2os_cli.bootstrap import activate_h2os_home


def setup_weixin(home: Path) -> int:
    """Run Weixin QR onboarding after pinning the H2OS data directory."""

    resolved = activate_h2os_home(home)
    print(f"H2OS Weixin setup · data stays in {resolved}")
    try:
        from hermes_cli.gateway import _setup_weixin

        _setup_weixin()
    except KeyboardInterrupt:
        print("H2OS Weixin setup cancelled.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"H2OS Weixin setup failed: {exc}", file=sys.stderr)
        return 1
    return 0

