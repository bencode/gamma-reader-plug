import type { PluginCard, PluginStatus } from '@gamma-reader-plug/shared/plugins'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { App } from './app'

const card = (status: PluginStatus, name = 'getnote'): PluginCard => ({
  name,
  title: name === 'getnote' ? '得到大脑' : name,
  summary: 'Notes',
  icon: `/api/${name}/icon.svg`,
  status,
  tools: [{ name: `${name}_search`, description: 'Search notes' }],
})

// The plug's server, answering in order for each path: null is 204, a Response is itself.
const serve = (answers: Record<string, unknown[]>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const answer = answers[String(input)]?.shift()
    if (answer === undefined) throw new Error(`Unexpected request: ${String(input)}`)
    if (answer instanceof Response) return answer
    return answer === null ? new Response(null, { status: 204 }) : Response.json(answer)
  })

const show = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

describe('plug home page', () => {
  it("shows each plugin's state in this browser", async () => {
    serve({
      '/api/plugins': [
        {
          plugins: [
            card({ kind: 'connected' }),
            card({ kind: 'invalid' }, 'old'),
            card({ kind: 'needs_membership', membershipUrl: 'https://example.com/join' }, 'paid'),
            card({ kind: 'unknown', message: 'Limited just now' }, 'busy'),
          ],
        },
      ],
    })
    show('/')

    const list = await screen.findByRole('list', { name: '插件' })
    const [connected, invalid, paid, busy] = within(list).getAllByRole('listitem')
    expect(connected).toHaveTextContent('已连接')
    expect(within(connected as HTMLElement).getByRole('link', { name: '详情' })).toHaveAttribute(
      'href',
      '/getnote',
    )
    expect(connected).toHaveTextContent('「API Key」页面删除它')
    expect(within(connected as HTMLElement).getByRole('button', { name: '断开' })).toBeVisible()
    expect(invalid).toHaveTextContent('API Key 已失效')
    expect(within(paid as HTMLElement).getByRole('link', { name: '去开通' })).toHaveAttribute(
      'href',
      'https://example.com/join',
    )
    expect(busy).toHaveTextContent('暂时无法确认：Limited just now')
  })

  it("connects with the user's own key, says why one is turned down, and disconnects", async () => {
    const user = userEvent.setup()
    const network = serve({
      '/api/plugins': [
        { plugins: [card({ kind: 'disconnected' })] },
        { plugins: [card({ kind: 'connected' })] },
        { plugins: [card({ kind: 'disconnected' })] },
      ],
      '/api/getnote/connect': [
        Response.json({ error: { message: 'Client ID 或 API Key 不对' } }, { status: 400 }),
        null,
      ],
      '/api/getnote/disconnect': [null],
    })
    show('/')

    await user.click(await screen.findByRole('button', { name: '连接' }))
    await user.type(screen.getByLabelText('Client ID'), 'cli_user')
    await user.type(screen.getByLabelText('API Key'), 'gk_wrong')
    await user.click(screen.getByRole('button', { name: '连接' }))
    expect(await screen.findByText('Client ID 或 API Key 不对')).toBeVisible()

    await user.clear(screen.getByLabelText('API Key'))
    await user.type(screen.getByLabelText('API Key'), 'gk_user')
    await user.click(screen.getByRole('button', { name: '连接' }))
    expect(await screen.findByText('已连接')).toBeVisible()
    const sent = network.mock.calls.filter(([path]) => path === '/api/getnote/connect')
    expect(JSON.parse(String(sent[1]?.[1]?.body))).toEqual({
      clientId: 'cli_user',
      apiKey: 'gk_user',
    })

    await user.click(screen.getByRole('button', { name: '断开' }))
    expect(await screen.findByText('未连接')).toBeVisible()
  })

  it("lists the APIs of the plugin's service and marks the ones its tools use", async () => {
    serve({ '/api/plugins': [{ plugins: [card({ kind: 'connected' })] }] })
    show('/getnote')

    expect(await screen.findByRole('heading', { name: '得到大脑相关 API' })).toBeVisible()
    expect(screen.getByText('POST recall').closest('tr')).toHaveTextContent('✓ getnote_search')
    expect(screen.getByText('POST note/update').closest('tr')).toHaveTextContent('—')
    expect(screen.getByText('交给助手的工具（1）')).toBeVisible()
    expect(screen.queryByRole('link', { name: '详情' })).toBeNull()
  })
})
