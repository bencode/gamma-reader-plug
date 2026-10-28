import type { PluginCard } from '@gamma-reader-plug/shared/plugins'
import { serveStatic } from '@hono/node-server/serve-static'
import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import type { PlugConfig } from './config.js'
import { type Plugin, PluginError } from './plugin.js'
import type { PluginManifest } from './protocol.js'

export const createApp = (
  config: Pick<PlugConfig, 'plugOrigin' | 'readerOrigin'>,
  plugins: readonly Plugin[],
  webRoot?: string,
) => {
  const app = new Hono()
  const iconPath = (plugin: Plugin) => `/api/${plugin.name}/icon.svg`
  const refuse = (c: Context, status: 403 | 404, message: string) =>
    c.json({ error: { message } }, status)

  app.get('/api/health', c => c.json({ status: 'ok', service: 'gamma-reader-plug' }))

  // The plug's own page. A form or script on another site could otherwise connect or disconnect
  // a service in the user's name.
  app.post('/api/*', async (c, next) => {
    if (c.req.header('Origin') !== config.plugOrigin) return refuse(c, 403, 'Forbidden')
    await next()
  })
  app.get('/api/plugins', async c => {
    const cards: PluginCard[] = await Promise.all(
      plugins.map(async plugin => ({
        name: plugin.name,
        title: plugin.title,
        summary: plugin.summary,
        icon: iconPath(plugin),
        status: await plugin.status(c),
        tools: plugin.tools.map(({ name, description }) => ({ name, description })),
      })),
    )
    return c.json({ plugins: cards })
  })
  for (const plugin of plugins) {
    app.get(iconPath(plugin), c =>
      c.body(plugin.icon, 200, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
      }),
    )
    app.route(`/api/${plugin.name}`, plugin.routes)
  }

  // The reader, on another origin of the same site, calling with the user's cookies.
  const reader = cors({
    origin: config.readerOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })
  app.use('/manifest', reader)
  app.use('/:plugin/tools/:tool', reader)
  app.get('/manifest', c => {
    const manifest: PluginManifest = {
      plugins: plugins
        .filter(plugin => plugin.connected(c))
        .map(plugin => ({
          name: plugin.name,
          title: plugin.title,
          icon: `${config.plugOrigin}${iconPath(plugin)}`,
          tools: [...plugin.tools],
        })),
    }
    return c.json(manifest)
  })
  app.post('/:plugin/tools/:tool', async c => {
    // A JSON body needs a preflight, which only the reader passes.
    if (
      c.req.header('Origin') !== config.readerOrigin ||
      !c.req.header('Content-Type')?.startsWith('application/json')
    )
      return refuse(c, 403, 'Forbidden')
    const plugin = plugins.find(item => item.name === c.req.param('plugin'))
    if (!plugin) return refuse(c, 404, `There is no plugin named ${c.req.param('plugin')}.`)
    const input: unknown = await c.req.json().catch((cause: unknown) => {
      if (cause instanceof SyntaxError) throw new PluginError(400, 'The arguments are not JSON.')
      throw cause
    })
    return c.json(await plugin.call(c, c.req.param('tool'), input))
  })

  if (webRoot) {
    const page = serveStatic({ root: webRoot, path: 'index.html' })
    app.get('/', page)
    // Each plugin's own page; the page routes it in the browser.
    for (const plugin of plugins) app.get(`/${plugin.name}`, page)
    app.use('/assets/*', serveStatic({ root: webRoot }))
  }

  app.onError((error, c) => {
    if (error instanceof PluginError)
      return c.json({ error: { message: error.message } }, error.status)
    console.error('Request failed', error)
    return c.json({ error: { message: 'Internal server error' } }, 500)
  })

  return app
}
