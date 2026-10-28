import { PluginError } from '../../plugin.js'

const apiBase = 'https://openapi.biji.com/open/api/v1'

// Where a user goes to connect again.
export type GetnoteApp = { plugOrigin: string }

// A user's own application at 得到大脑 and an API Key they made for it.
export type GetnoteCredential = { clientId: string; apiKey: string }

type Envelope = {
  success: boolean
  data: unknown
  error: {
    code?: number
    message?: string
    reason?: string
    membership_url?: string
    reset_at?: string | number
  } | null
  request_id?: string
}

// A failed call, with the code that tells an expired authorization or a missing membership apart.
export class GetnoteError extends PluginError {
  constructor(
    status: ConstructorParameters<typeof PluginError>[0],
    message: string,
    readonly code: number | undefined,
    readonly membershipUrl?: string,
  ) {
    super(status, message)
  }
}

// A resource call as the user. A failure can come with HTTP 200, so success is what decides.
export const getnote = async <T>(
  app: GetnoteApp,
  credential: GetnoteCredential,
  method: 'GET' | 'POST',
  path: string,
  input: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<T> => {
  const url = new URL(`${apiBase}/resource/${path}`)
  if (method === 'GET') {
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value))
    })
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: credential.apiKey,
      'X-Client-ID': credential.clientId,
      ...(method === 'POST' && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(method === 'POST' && { body: JSON.stringify(input) }),
  })
  return unwrap<T>(app, path, response)
}

const unwrap = async <T>(app: GetnoteApp, path: string, response: Response): Promise<T> => {
  // A proxy's error page is not JSON.
  const parsed: unknown = await response.json().catch((cause: unknown) => {
    if (!(cause instanceof SyntaxError)) throw cause
    return null
  })
  const body = isEnvelope(parsed) ? parsed : null
  // The data's shape is the one 得到大脑 documents for each call.
  if (body?.success && body.data !== null) return body.data as T
  const error = body?.error ?? undefined
  // Only what helps to trace a failure; never a note's content.
  console.warn(
    `getnote ${path} failed: HTTP ${response.status}, ${error?.reason ?? error?.code ?? 'no body'}, request ${body?.request_id ?? '-'}`,
  )
  throw refusal(app, response.status, error, body?.request_id)
}

const isEnvelope = (value: unknown): value is Envelope =>
  typeof value === 'object' && value !== null && 'success' in value

const refusal = (
  app: GetnoteApp,
  status: number,
  error: Envelope['error'] | undefined,
  requestId: string | undefined,
) => {
  const code = error?.code
  if (code === 10004 || status === 401) {
    return new GetnoteError(
      401,
      `The 得到大脑 API Key was deleted or is not valid. Enter a working one at ${app.plugOrigin}.`,
      code,
    )
  }
  if (code === 10201) {
    return new GetnoteError(
      403,
      `得到大脑's open API is for members only.${error?.membership_url ? ` Become a member at ${error.membership_url}.` : ''}`,
      code,
      error?.membership_url,
    )
  }
  if (code === 10202 || code === 10203 || status === 429) {
    return new GetnoteError(
      429,
      `得到大脑 is limiting calls just now.${error?.reset_at ? ` It resets at ${error.reset_at}.` : ''}`,
      code,
    )
  }
  if (code === 10500) return new GetnoteError(404, 'There is no such note.', code)
  return new GetnoteError(
    502,
    `得到大脑 failed: ${error?.message ?? `HTTP ${status}`}${requestId ? ` (request ${requestId})` : ''}.`,
    code,
  )
}
