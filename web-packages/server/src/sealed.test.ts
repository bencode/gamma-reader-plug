import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { open, seal } from './sealed.js'

describe('sealed values', () => {
  it('opens what the same key sealed, and nothing altered or sealed with another key', () => {
    const key = randomBytes(32)
    const sealed = seal(key, { apiKey: 'gk_live_a', expiresAt: 1 })
    const bytes = Buffer.from(sealed, 'base64url')
    bytes[bytes.length - 1] = (bytes.at(-1) ?? 0) ^ 1

    expect(open(key, sealed)).toEqual({ apiKey: 'gk_live_a', expiresAt: 1 })
    expect(open(key, bytes.toString('base64url'))).toBeNull()
    expect(open(randomBytes(32), sealed)).toBeNull()
    expect(open(key, 'short')).toBeNull()
  })
})
