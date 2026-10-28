import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app.js'
import { createGetnote } from './index.js'

afterEach(() => vi.restoreAllMocks())

const plugOrigin = 'https://plug.example.com'
const app = createApp({ plugOrigin, readerOrigin: 'https://reader.example.com' }, [
  createGetnote({ clientId: 'cli_app', appKey: 'gk_app', plugOrigin, secret: randomBytes(32) }),
])
const answer = (data: object) => Response.json({ success: true, data, error: null })

// A browser's cookie jar, enough for one site.
const browser = () => {
  const jar = new Map<string, string>()
  return async (path: string, init: RequestInit = {}) => {
    const response = await app.request(path, {
      ...init,
      headers: {
        Origin: plugOrigin,
        Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
        ...init.headers,
      },
    })
    response.headers.getSetCookie().forEach(cookie => {
      const [pair = '', ...attributes] = cookie.split('; ')
      const [name = '', value = ''] = pair.split('=')
      if (attributes.some(attribute => attribute === 'Max-Age=0')) jar.delete(name)
      else jar.set(name, value)
    })
    return response
  }
}

describe('connecting 得到大脑', () => {
  it('waits for the user to confirm, then keeps their key for this browser alone', async () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        answer({
          code: 'device',
          user_code: 'ABCD-EFGH',
          verification_uri: 'https://biji.com/openapi/oauth/authorize?code=device',
          expires_in: 600,
          interval: 5,
        }),
      )
      .mockResolvedValueOnce(answer({ msg: 'authorization_pending' }))
      .mockResolvedValueOnce(
        answer({
          client_id: 'cli_app',
          api_key: 'gk_user',
          key_id: 'k1',
          expires_at: 2_000_000_000,
        }),
      )
    const user = browser()
    const post = (path: string) => user(path, { method: 'POST' })

    expect(await (await post('/api/getnote/connect')).json()).toEqual({
      userCode: 'ABCD-EFGH',
      verificationUri: 'https://biji.com/openapi/oauth/authorize?code=device',
      interval: 5,
      expiresIn: 600,
    })
    expect(await (await post('/api/getnote/connect/poll')).json()).toEqual({ status: 'pending' })
    expect(await (await post('/api/getnote/connect/poll')).json()).toEqual({ status: 'connected' })
    expect(JSON.parse(String(network.mock.calls[2]?.[1]?.body))).toEqual({
      client_id: 'cli_app',
      grant_type: 'device_code',
      code: 'device',
    })

    const names = async (manifest: Response) =>
      ((await manifest.json()) as { plugins: { name: string }[] }).plugins.map(item => item.name)
    expect(await names(await user('/manifest'))).toEqual(['getnote'])
    expect(await names(await browser()('/manifest'))).toEqual([])

    await post('/api/getnote/disconnect')
    expect(await names(await user('/manifest'))).toEqual([])
  })
})
