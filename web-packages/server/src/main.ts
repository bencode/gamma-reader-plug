import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { readConfig } from './config.js'
import { createPlugins } from './plugins/index.js'

const config = readConfig(process.env)

const webRoot =
  process.env.NODE_ENV === 'production'
    ? fileURLToPath(new URL('../../../ui-packages/web/dist/', import.meta.url))
    : undefined

if (webRoot) {
  try {
    await access(`${webRoot}/index.html`)
  } catch (cause) {
    throw new Error('The page build is unavailable. Run pnpm build before pnpm start.', { cause })
  }
}

const app = createApp(config, createPlugins(config), webRoot)

serve({ fetch: app.fetch, port: config.port, hostname: config.hostname }, info => {
  console.log(`Gamma Reader Plug: http://${info.address}:${info.port}`)
})
