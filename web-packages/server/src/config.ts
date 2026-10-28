export type PlugConfig = {
  port: number
  hostname: string
  // Where this app is served, and the reader it serves; both are origins such as https://x.example.
  plugOrigin: string
  readerOrigin: string
  // Seals the credentials kept in cookies.
  secret: Buffer
  getnote: { clientId: string; appKey: string }
}

export const readConfig = (env: NodeJS.ProcessEnv): PlugConfig => {
  const port = Number(env.PORT ?? 3304)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }
  const secret = Buffer.from(required(env, 'PLUG_SECRET'), 'base64')
  if (secret.length !== 32) throw new Error('PLUG_SECRET must be 32 bytes, base64 encoded')
  return {
    port,
    hostname: env.HOST ?? '127.0.0.1',
    plugOrigin: origin(env, 'PLUG_ORIGIN'),
    readerOrigin: origin(env, 'READER_ORIGIN'),
    secret,
    getnote: {
      clientId: required(env, 'GETNOTE_CLIENT_ID'),
      appKey: required(env, 'GETNOTE_APP_KEY'),
    },
  }
}

const required = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

const origin = (env: NodeJS.ProcessEnv, name: string) => {
  const value = required(env, name).replace(/\/+$/, '')
  const url = URL.parse(value)
  if (!url || !/^https?:$/.test(url.protocol) || url.origin !== value) {
    throw new Error(`${name} must be an origin, such as https://example.com`)
  }
  return value
}
