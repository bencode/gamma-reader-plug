# Gamma Reader Plug

Plugins for Gamma Reader. A user connects a service on this app's page; the reader then lists the
connected plugins from `/manifest` and calls their tools on this app. The protocol is Gamma
Reader's `docs/plugins.md`.

Run `pnpm check` (Biome, TypeScript, tests) before proposing a change. `pnpm dev` runs the server
and the page together; copy `.env.example` to `.env` first.

## Packages

| Package               | Role                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `web-packages/server` | Hono server: the page's API, the manifest, tool calls                |
| `ui-packages/web`     | The page, in Chinese: each plugin, its state, connect and disconnect |
| `packages/shared`     | Types both of them use; types only, no runtime code                  |

`packages/shared` holds only what both sides use. The reader protocol's types live in the server
(`src/protocol.ts`), since only the server speaks it.

## Plugins

A plugin is a folder in each package, registered in that package's `plugins/index.ts`:

- `web-packages/server/src/plugins/<name>/` defines the `Plugin`: its status, connect routes
  under `/api/<name>`, and tools named `<name>_…`.
- `ui-packages/web/src/plugins/<name>/` holds its connect component.

There is no user database. A plugin keeps its credential in a cookie sealed with `PLUG_SECRET`,
so a connection belongs to one browser. Tool descriptions are in English, for the model; the page
is in Chinese.
