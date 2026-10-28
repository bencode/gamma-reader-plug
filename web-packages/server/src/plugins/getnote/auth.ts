import type { ConnectStart, PollResult } from '@gamma-reader-plug/shared/plugins'
import { Hono } from 'hono'
import { PluginError } from '../../plugin.js'
import type { SealedCookie } from '../../sealed.js'
import { type GetnoteApp, type GetnoteCredential, getnoteOauth } from './client.js'

// A device code waiting for the user to confirm on 得到大脑's own page; expiresAt in milliseconds.
export type Pending = { code: string; expiresAt: number }

type DeviceCode = {
  code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

// Until the user confirms, the token call answers with msg; once they do, with a key of their own.
type Token =
  | { msg: string }
  | { client_id: string; api_key: string; key_id: string; expires_at: number }

const waiting = new Set(['authorization_pending', 'slow_down'])
const ended = new Set(['expired_token', 'access_denied'])

// Connecting by device code: the user confirms on 得到大脑's page while the plug's page polls.
export const authRoutes = (
  app: GetnoteApp,
  cookies: { credential: SealedCookie<GetnoteCredential>; pending: SealedCookie<Pending> },
) =>
  new Hono()
    .post('/connect', async c => {
      const code = await getnoteOauth<DeviceCode>(app, 'device/code', {})
      cookies.pending.set(
        c,
        { code: code.code, expiresAt: Date.now() + code.expires_in * 1000 },
        code.expires_in,
      )
      const start: ConnectStart = {
        userCode: code.user_code,
        verificationUri: code.verification_uri,
        interval: code.interval,
        expiresIn: code.expires_in,
      }
      return c.json(start)
    })
    .post('/connect/poll', async c => {
      const result = (status: PollResult['status']) => c.json<PollResult>({ status })
      const pending = cookies.pending.get(c)
      if (!pending || pending.expiresAt <= Date.now()) {
        cookies.pending.clear(c)
        return result('expired')
      }
      const token = await getnoteOauth<Token>(app, 'token', {
        grant_type: 'device_code',
        code: pending.code,
      })
      if ('api_key' in token) {
        cookies.credential.set(
          c,
          { apiKey: token.api_key, expiresAt: token.expires_at },
          token.expires_at - Date.now() / 1000,
        )
        cookies.pending.clear(c)
        return result('connected')
      }
      if (waiting.has(token.msg)) return result('pending')
      if (ended.has(token.msg)) {
        cookies.pending.clear(c)
        return result('expired')
      }
      throw new PluginError(502, `得到大脑 answered the authorization unexpectedly: ${token.msg}.`)
    })
    .post('/disconnect', c => {
      cookies.credential.clear(c)
      return c.body(null, 204)
    })
