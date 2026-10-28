import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createApp } from './app.js'
import { defineTool, type Plugin, toolset } from './plugin.js'

const plugOrigin = 'https://plug.example.com'
const readerOrigin = 'https://reader.example.com'

// Connected when the request carries notes=on; its one tool echoes the query.
const notes: Plugin = {
  name: 'notes',
  title: 'Notes',
  summary: 'Your notes',
  icon: '<svg/>',
  connected: c => c.req.header('Cookie') === 'notes=on',
  status: async c =>
    c.req.header('Cookie') === 'notes=on' ? { kind: 'connected' } : { kind: 'disconnected' },
  routes: new Hono().post('/disconnect', c => c.body(null, 204)),
  ...toolset(
    [
      defineTool({
        name: 'notes_search',
        description: 'Search notes',
        input: z.object({ query: z.string().min(1) }),
        run: async (input, user: string) => ({ user, query: input.query }),
      }),
    ],
    c => (c.req.header('Cookie') === 'notes=on' ? 'reader' : null),
    'Connect Notes first.',
  ),
}

const app = createApp({ plugOrigin, readerOrigin }, [notes])
const connected = { Cookie: 'notes=on' }
const call = (headers: Record<string, string>, body = '{"query":"actions"}') =>
  app.request('/notes/tools/notes_search', {
    method: 'POST',
    headers: { Origin: readerOrigin, 'Content-Type': 'application/json', ...headers },
    body,
  })

describe('plug app', () => {
  it("serves its own page the plugins' state, and refuses its actions from another origin", async () => {
    const cards = await app.request('/api/plugins', { headers: connected })
    expect(await cards.json()).toEqual({
      plugins: [
        {
          name: 'notes',
          title: 'Notes',
          summary: 'Your notes',
          icon: '/api/notes/icon.svg',
          status: { kind: 'connected' },
          tools: ['notes_search'],
        },
      ],
    })
    const disconnect = (origin: string) =>
      app.request('/api/notes/disconnect', { method: 'POST', headers: { Origin: origin } })
    expect((await disconnect(plugOrigin)).status).toBe(204)
    expect((await disconnect(readerOrigin)).status).toBe(403)
  })

  it('lets the reader, and only the reader, call with credentials', async () => {
    const preflight = await app.request('/notes/tools/notes_search', {
      method: 'OPTIONS',
      headers: {
        Origin: readerOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    const manifest = await app.request('/manifest', { headers: { Origin: readerOrigin } })

    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(readerOrigin)
    expect(preflight.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(manifest.headers.get('Access-Control-Allow-Origin')).toBe(readerOrigin)
    expect((await call({ ...connected, Origin: 'https://elsewhere.example' })).status).toBe(403)
    expect((await call({ ...connected, 'Content-Type': 'text/plain' })).status).toBe(403)
  })

  it('lists and runs a plugin only where this browser connected it', async () => {
    const manifest = async (headers: Record<string, string>) =>
      (await app.request('/manifest', { headers })).json()

    expect(await manifest({})).toEqual({ plugins: [] })
    expect(await manifest(connected)).toEqual({
      plugins: [
        {
          name: 'notes',
          title: 'Notes',
          icon: `${plugOrigin}/api/notes/icon.svg`,
          tools: [
            {
              name: 'notes_search',
              description: 'Search notes',
              parameters: expect.objectContaining({ type: 'object', required: ['query'] }),
            },
          ],
        },
      ],
    })
    expect(await (await call(connected)).json()).toEqual({ user: 'reader', query: 'actions' })

    const unconnected = await call({})
    const invalid = await call(connected, '{"query":""}')
    expect(unconnected.status).toBe(401)
    expect(await unconnected.json()).toEqual({ error: { message: 'Connect Notes first.' } })
    expect(invalid.status).toBe(400)
    expect(((await invalid.json()) as { error: { message: string } }).error.message).toContain(
      'query',
    )
  })

  it("serves the page at each plugin's own path, and nothing at other paths", async () => {
    const webRoot = await mkdtemp(join(tmpdir(), 'plug-web-'))
    await writeFile(join(webRoot, 'index.html'), '<title>plug</title>')
    try {
      const served = createApp({ plugOrigin, readerOrigin }, [notes], webRoot)
      expect(await (await served.request('/notes')).text()).toBe('<title>plug</title>')
      expect((await served.request('/nothing')).status).toBe(404)
    } finally {
      await rm(webRoot, { recursive: true })
    }
  })
})
