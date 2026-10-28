import type { ComponentType } from 'react'
import { getnoteApis } from './getnote/apis'
import { GetnoteConnect } from './getnote/connect'

export type ConnectProps = { label: string; onConnected: () => Promise<void> }

// One API of the service a plugin connects. tools are the plugin's tools that call it.
export type ServiceApi = {
  group: string
  method: 'GET' | 'POST'
  path: string
  description: string
  access: '读' | '新建' | '修改' | '删除'
  tools?: readonly string[]
}

// How each plugin connects, by name; what to tell a user about revoking it for good; and every API
// its service offers, for the plugin's own page.
export const connectors: Record<
  string,
  | {
      Connect: ComponentType<ConnectProps>
      revokeHint?: string
      apis?: { service: string; list: readonly ServiceApi[] }
    }
  | undefined
> = {
  getnote: {
    Connect: GetnoteConnect,
    apis: { service: '得到大脑开放平台', list: getnoteApis },
    revokeHint:
      '断开只清除这个浏览器里保存的 Key。要让它彻底失效，请到得到大脑的「API Key」页面删除它。',
  },
}
