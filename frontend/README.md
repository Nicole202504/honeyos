# HoneyOS companion frontend

This directory contains the production React companion UI served at `/`.
`/new-ui/` remains an address alias for bookmarks created during development.

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

## AI and user customization

`src/custom/` is the supported customization boundary. AI customization tools
should change the manifest, components and theme in that directory before
touching product pages or the HoneyOS runtime. The layer currently exposes an
application frame and a message frame; it cannot replace session state, tool
events, permissions or the backend transport.

Before a meaningful UI change, save a local snapshot:

```bash
pnpm honeyos:ui:snapshot -- before-redesign
```

Inspect or restore snapshots with:

```bash
pnpm honeyos:ui:list
pnpm honeyos:ui:restore -- <snapshot-name>
pnpm build
```

If custom UI code is broken, open `/?honeyos-safe-ui=1`. This bypasses
all custom frames for the current browser tab while keeping chat and data
available. Open `/?honeyos-safe-ui=0` to enable customization again.
