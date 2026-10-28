import type { ComponentType } from 'react'
import { GetnoteConnect } from './getnote/connect'

export type ConnectProps = { label: string; onConnected: () => Promise<void> }

// How each plugin connects, by name; what it keeps about the user, shown always; and what to tell a
// user about revoking it for good.
export const connectors: Record<
  string,
  { Connect: ComponentType<ConnectProps>; about?: string; revokeHint?: string } | undefined
> = {
  getnote: {
    Connect: GetnoteConnect,
    about:
      '你的 Client ID 和 API Key 加密后只保存在你这个浏览器的 cookie 里。服务器不保存任何与你相关的东西：没有账号，没有数据库，笔记内容只在调用时经过，不留存，也不写进日志。',
    revokeHint:
      '断开只清除这个浏览器里保存的 Key。要让它彻底失效，请到得到大脑的「API Key」页面删除它。',
  },
}
