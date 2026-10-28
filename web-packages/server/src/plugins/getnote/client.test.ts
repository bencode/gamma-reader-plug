import { afterEach, describe, expect, it, vi } from 'vitest'
import { getnote } from './client.js'

afterEach(() => vi.restoreAllMocks())

const app = { clientId: 'cli_app', appKey: 'gk_app', plugOrigin: 'https://plug.example.com' }
const credential = { apiKey: 'gk_user', expiresAt: 2_000_000_000 }
const failure = (code: number, extra: object = {}, status = 200) =>
  Response.json(
    { success: false, data: null, error: { code, message: 'failed', ...extra }, request_id: 'r1' },
    { status },
  )

describe('得到大脑 calls', () => {
  it('sends the user key, and turns a failure answered with HTTP 200 into a refusal', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ success: true, data: { notes: [] }, error: null }))
      .mockResolvedValueOnce(failure(10201, { membership_url: 'https://www.biji.com/join' }))
      .mockResolvedValueOnce(failure(10004, {}, 401))
      .mockResolvedValueOnce(failure(10203, { reset_at: '2026-11-01T00:00:00Z' }))
      .mockResolvedValueOnce(failure(30000))
    const list = () => getnote(app, credential, 'GET', 'note/list', { page_size: 1 })

    expect(await list()).toEqual({ notes: [] })
    const [url, init] = network.mock.calls[0] ?? []
    expect(String(url)).toBe('https://openapi.biji.com/open/api/v1/resource/note/list?page_size=1')
    expect(init?.headers).toMatchObject({ Authorization: 'gk_user', 'X-Client-ID': 'cli_app' })
    await expect(list()).rejects.toMatchObject({
      status: 403,
      membershipUrl: 'https://www.biji.com/join',
    })
    await expect(list()).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('https://plug.example.com'),
    })
    await expect(list()).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('2026-11-01T00:00:00Z'),
    })
    await expect(list()).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('request r1'),
    })
  })
})
