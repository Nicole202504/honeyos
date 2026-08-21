# HoneyOS companion frontend

This directory contains the opt-in React companion UI served at `/new-ui/`.
The existing interface remains the default and is the rollback path while the
React migration is incomplete.

## Boundaries

- The HoneyOS `aiohttp` API remains the backend.
- `HoneyRuntimeStore` owns live session and message state.
- TanStack Query owns REST snapshots such as settings.
- `assistant-ui-adapter.ts` is the only future assistant-ui integration point.
- The backend protocol is not changed by frontend work.

## Local development

```bash
pnpm install
pnpm dev
```

Vite runs on port 5173 and proxies `/api` and `/v1` to HoneyOS on port 8642.

## Production build

```bash
pnpm build
```

The build is written to `honeyos/companion/react_dist`. HoneyOS serves it
without a separate Node process. A valid build can also be placed in
`HoneyOS Projects/HoneyOS UI/react_dist` as a last-known-good local override.
