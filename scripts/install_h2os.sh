#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if ! command -v uv >/dev/null 2>&1; then
    echo "H2OS needs uv. Install it from https://docs.astral.sh/uv/ first." >&2
    exit 1
fi

cd "$REPO_DIR"
uv sync --extra h2os
exec uv run h2os setup
