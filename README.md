# Gamma Reader Plug

Plugins for [Gamma Reader](https://github.com/bencode/gamma-reader): connect a service once here, then turn it on in a reader conversation to give the reading assistant its tools.

The first plugin is 得到大脑: the assistant can search and read your notes, and save a new note
when you ask.

## Running locally

```sh
cp .env.example .env   # fill in PLUG_SECRET and the 得到大脑 application
pnpm install
pnpm dev               # the page at http://localhost:5304, the server at :3304
```

Point a local reader at it with `GAMMA_PLUGINS_URL=http://localhost:5304`.

## Deploying

`docker compose -f compose.production.yml up -d --build` with the variables of `.env.example`
set. Serve it on a subdomain of the reader's domain, and set `GAMMA_PLUGINS_URL` on the reader.
