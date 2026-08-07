# H2OS Quickstart

H2OS runs one private AI companion in an isolated local data directory. It can coexist with a normal Hermes installation because it uses its own command, runtime identity, process environment, and `~/.h2os` home.

## Development install

From this pinned H2OS fork, run one command:

```bash
./scripts/install_h2os.sh
```

The guided flow downloads the runtime dependencies, asks for an OpenAI-compatible Base URL and Model ID, reads the API Key without echoing it, validates the model service, connects Weixin, and only then starts H2OS. OpenRouter remains an optional choice. Secrets stay in `~/.h2os/.env`; behavioral settings stay in `~/.h2os/config.yaml`.

## Connect Weixin

```bash
uv run h2os channel setup weixin
```

Scan the QR code with WeChat and confirm the login. H2OS defaults to direct-message pairing, disables group chats, and exposes only persistent memory and past-session search to the companion.

## Run and inspect

```bash
uv run h2os start
uv run h2os status
uv run h2os doctor
uv run h2os logs
```

Stop or restart the background message service with:

```bash
uv run h2os stop
uv run h2os restart
```

All companion identity, memory, sessions, credentials, and logs stay under `~/.h2os`. Existing data under `~/.hermes` is not imported or modified.
