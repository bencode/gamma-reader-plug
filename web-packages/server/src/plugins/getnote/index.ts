import type { PluginStatus } from '@gamma-reader-plug/shared/plugins'
import { type Plugin, toolset } from '../../plugin.js'
import { sealedCookie } from '../../sealed.js'
import { authRoutes } from './auth.js'
import { type GetnoteApp, type GetnoteCredential, GetnoteError, getnote } from './client.js'
import { getnoteTools } from './tools.js'

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#e8590c"/><path d="M10 9h12M10 16h12M10 23h7" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const createGetnote = ({ secret, ...app }: GetnoteApp & { secret: Buffer }): Plugin => {
  // Over plain http, as in local development, a Secure cookie would never come back.
  const secure = app.plugOrigin.startsWith('https:')
  const credential = sealedCookie<GetnoteCredential>('getnote', secret, secure, value =>
    isRecord(value) && typeof value.clientId === 'string' && typeof value.apiKey === 'string'
      ? { clientId: value.clientId, apiKey: value.apiKey }
      : null,
  )
  return {
    name: 'getnote',
    title: '得到大脑',
    summary: '让阅读助手搜索、阅读你的得到大脑笔记，并在你要求时新建笔记。',
    icon,
    connected: c => credential.get(c) !== null,
    // A light call confirms the key still works, so the page can tell a deleted one apart.
    status: async (c): Promise<PluginStatus> => {
      const held = credential.get(c)
      if (!held) return { kind: 'disconnected' }
      try {
        await getnote(app, held, 'GET', 'note/list', { page_size: 1 })
        return { kind: 'connected' }
      } catch (cause) {
        if (!(cause instanceof GetnoteError)) throw cause
        if (cause.status === 401) return { kind: 'expired' }
        if (cause.code === 10201) {
          return {
            kind: 'needs_membership',
            membershipUrl: cause.membershipUrl ?? 'https://www.biji.com',
          }
        }
        return { kind: 'unknown', message: cause.message }
      }
    },
    routes: authRoutes(app, credential),
    ...toolset(
      getnoteTools(app),
      c => credential.get(c),
      `得到大脑 is not connected in this browser. Connect it at ${app.plugOrigin}.`,
    ),
  }
}
