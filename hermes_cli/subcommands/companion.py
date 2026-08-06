"""``hermes companion`` subcommand parser."""

from __future__ import annotations

from typing import Callable


def build_companion_parser(subparsers, *, cmd_companion: Callable) -> None:
    parser = subparsers.add_parser(
        "companion",
        help="Connect and run H2OS companions on messaging channels",
    )
    commands = parser.add_subparsers(dest="companion_action")
    commands.add_parser("list", help="List H2OS companions")

    connect = commands.add_parser(
        "connect-weixin",
        help="Connect a companion to Weixin using an iLink QR code",
    )
    connect.add_argument("companion", help="Companion ID, profile name, or display name")

    run = commands.add_parser(
        "run",
        help="Run a companion's Weixin Gateway in the foreground",
    )
    run.add_argument("companion", help="Companion ID, profile name, or display name")
    parser.set_defaults(func=cmd_companion)
