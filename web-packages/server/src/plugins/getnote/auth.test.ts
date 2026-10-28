import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app.js'
import { createGetnote } from './index.js'

afterEach(() => vi.restoreAllMocks())

const plugOrigin = 'https://plug.example.com'
const app = createApp({ plugOrigin, readerOrigin: 'https://reader.example.com' }, [
  createGetnote({ plugOrigin, secret: randomBytes(32) }),
])
const notes = () => Response.json({ success: true, data: { notes: [], has_more: false } })

// A browser's cookie jar, enough for one site; it remembers how long each cookie was given.
const browser = () => {
  const jar = new Map<string, { value: string; maxAge: string }>()
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await app.request(path, {
      ...init,
      headers: {
        Origin: plugOrigin,
        Cookie: [...jar].map(([name, { value }]) => `${name}=${value}`).join('; '),
        ...init.headers,
      },
    })
    response.headers.getSetCookie().forEach(cookie => {
      const [pair = '', ...attributes] = cookie.split('; ')
      const [name = '', value = ''] = pair.split('=')
      const maxAge = attributes.find(item => item.startsWith('Max-Age='))?.slice(8) ?? ''
      if (maxAge === '0') jar.delete(name)
      else jar.set(name, { value, maxAge })
    })
    return response
  }
  return { request, jar }
}
const connect = (user: ReturnType<typeof browser>, body: object) =>
  user.request('/api/getnote/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const names = async (manifest: Response) =>
  ((await manifest.json()) as { plugins: { name: string }[] }).plugins.map(item => item.name)

describe('connecting 得到大脑', () => {
  it("keeps the user's own key for this browser alone once 得到大脑 accepts it", async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockResolvedValue(notes())
    const user = browser()

    expect((await connect(user, { clientId: ' cli_user ', apiKey: 'gk_user' })).status).toBe(204)
    expect(network.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: 'gk_user',
      'X-Client-ID': 'cli_user',
    })
    expect(await names(await user.request('/manifest'))).toEqual(['getnote'])
    expect(await names(await browser().request('/manifest'))).toEqual([])

    // Each use gives the cookie its full life again.
    user.jar.set('getnote', { value: user.jar.get('getnote')?.value ?? '', maxAge: '1' })
    await user.request('/manifest')
    expect(user.jar.get('getnote')?.maxAge).toBe(String(400 * 24 * 60 * 60))

    await user.request('/api/getnote/disconnect', { method: 'POST' })
    expect(await names(await user.request('/manifest'))).toEqual([])
  })

  it('keeps nothing when the key is missing or turned down, and says why', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ success: false, data: null, error: { code: 10004, message: 'invalid' } }),
    )
    const user = browser()

    const missing = await connect(user, { clientId: 'cli_user' })
    const refused = await connect(user, { clientId: 'cli_user', apiKey: 'gk_deleted' })
    expect(missing.status).toBe(400)
    expect(refused.status).toBe(400)
    expect(await refused.json()).toEqual({
      error: { message: 'Client ID 或 API Key 不对，或者这个 Key 已被删除。' },
    })
    expect(user.jar.size).toBe(0)
  })
})
