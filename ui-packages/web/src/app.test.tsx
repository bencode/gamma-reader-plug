import type { PluginCard, PluginStatus } from '@gamma-reader-plug/shared/plugins'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './app'

const card = (status: PluginStatus, name = 'getnote'): PluginCard => ({
  name,
  title: name === 'getnote' ? '得到大脑' : name,
  summary: 'Notes',
  icon: `/api/${name}/icon.svg`,
  status,
})

// The plug's server, answering in order for each path.
const serve = (answers: Record<string, unknown[]>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const answer = answers[String(input)]?.shift()
    if (answer === undefined) throw new Error(`Unexpected request: ${String(input)}`)
    return answer === null ? new Response(null, { status: 204 }) : Response.json(answer)
  })

describe('plug home page', () => {
  it("shows each plugin's state in this browser", async () => {
    serve({
      '/api/plugins': [
        {
          plugins: [
            card({ kind: 'connected', expiresAt: '2027-03-01T12:00:00.000Z' }),
            card({ kind: 'expired' }, 'old'),
            card({ kind: 'needs_membership', membershipUrl: 'https://example.com/join' }, 'paid'),
            card({ kind: 'unknown', message: 'Limited just now' }, 'busy'),
          ],
        },
      ],
    })
    render(<App />)

    const [connected, expired, paid, busy] = await screen.findAllByRole('listitem')
    expect(connected).toHaveTextContent('已连接 · 有效期至 2027/3/1')
    expect(connected).toHaveTextContent('「我的授权」')
    expect(within(connected as HTMLElement).getByRole('button', { name: '断开' })).toBeVisible()
    expect(expired).toHaveTextContent('授权已失效')
    expect(within(paid as HTMLElement).getByRole('link', { name: '去开通' })).toHaveAttribute(
      'href',
      'https://example.com/join',
    )
    expect(busy).toHaveTextContent('暂时无法确认：Limited just now')
  })

  it('connects once the user confirms on 得到大脑, and disconnects', async () => {
    const user = userEvent.setup()
    const network = serve({
      '/api/plugins': [
        { plugins: [card({ kind: 'disconnected' })] },
        { plugins: [card({ kind: 'connected', expiresAt: '2027-03-01T12:00:00.000Z' })] },
        { plugins: [card({ kind: 'disconnected' })] },
      ],
      '/api/getnote/connect': [
        {
          userCode: 'ABCD-EFGH',
          verificationUri: 'https://biji.com/authorize?code=1',
          interval: 0,
          expiresIn: 600,
        },
      ],
      '/api/getnote/connect/poll': [{ status: 'pending' }, { status: 'connected' }],
      '/api/getnote/disconnect': [null],
    })
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '连接' }))
    expect(await screen.findByRole('link', { name: '去得到大脑授权' })).toHaveAttribute(
      'href',
      'https://biji.com/authorize?code=1',
    )
    expect(screen.getByText('ABCD-EFGH')).toBeVisible()
    expect(await screen.findByText(/已连接/)).toBeVisible()
    expect(
      network.mock.calls.filter(([path]) => path === '/api/getnote/connect/poll'),
    ).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: '断开' }))
    expect(await screen.findByText('未连接')).toBeVisible()
  })
})
