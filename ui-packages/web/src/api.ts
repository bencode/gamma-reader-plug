import type { PluginCard } from '@gamma-reader-plug/shared/plugins'

export const loadPlugins = async (signal?: AbortSignal) => {
  const response = await checked(await fetch('/api/plugins', { signal }))
  const body: { plugins: PluginCard[] } = await response.json()
  return body.plugins
}

export const post = async (path: string, signal?: AbortSignal) =>
  checked(await fetch(path, { method: 'POST', signal }))

// The server explains a refusal as { error: { message } }.
const checked = async (response: Response) => {
  if (response.ok) return response
  const body: { error?: { message?: string } } | null = await response
    .json()
    .catch((cause: unknown) => {
      if (!(cause instanceof SyntaxError)) throw cause
      return null
    })
  throw new Error(body?.error?.message ?? `请求失败（HTTP ${response.status}）`)
}
