import type { ComponentType } from 'react'
import { GetnoteConnect } from './getnote/connect'

export type ConnectProps = { label: string; onConnected: () => Promise<void> }

// How each plugin connects, by name, and what to tell a user about revoking it for good.
export const connectors: Record<
  string,
  { Connect: ComponentType<ConnectProps>; revokeHint?: string } | undefined
> = {
  getnote: {
    Connect: GetnoteConnect,
    revokeHint: '断开只清除这个浏览器里的连接。要彻底撤销授权，请到得到大脑的「我的授权」页面。',
  },
}
