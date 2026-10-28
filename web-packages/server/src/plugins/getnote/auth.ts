import { Hono } from 'hono'
import { z } from 'zod'
import { PluginError } from '../../plugin.js'
import type { SealedCookie } from '../../sealed.js'
import { type GetnoteCredential, GetnoteError, getnote } from './client.js'

const connectInput = z.object({
  clientId: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
})

// Connecting with the user's own application and API Key: one light call proves they work before
// they are kept, sealed, in this browser.
export const authRoutes = (plugOrigin: string, credential: SealedCookie<GetnoteCredential>) =>
  new Hono()
    .post('/connect', async c => {
      const body: unknown = await c.req.json().catch((cause: unknown) => {
        if (cause instanceof SyntaxError) return null
        throw cause
      })
      const input = connectInput.safeParse(body)
      if (!input.success) throw new PluginError(400, '请填写 Client ID 和 API Key。')
      try {
        await getnote(plugOrigin, input.data, 'GET', 'note/list', { page_size: 1 })
      } catch (cause) {
        throw refusal(cause)
      }
      credential.set(c, input.data)
      return c.body(null, 204)
    })
    .post('/disconnect', c => {
      credential.clear(c)
      return c.body(null, 204)
    })

// What the page shows when 得到大脑 turns the key down.
const refusal = (cause: unknown) => {
  if (!(cause instanceof GetnoteError)) return cause
  if (cause.status === 401) {
    return new PluginError(400, 'Client ID 或 API Key 不对，或者这个 Key 已被删除。')
  }
  if (cause.code === 10201) return new PluginError(403, '这个账号还没有开通得到大脑会员。')
  if (cause.status === 429) return new PluginError(429, '得到大脑暂时限制了调用，请稍后再试。')
  return cause
}
