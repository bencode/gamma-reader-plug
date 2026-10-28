// What the plug's own page and its server say to each other.

export type PluginStatus =
  | { kind: 'disconnected' }
  | { kind: 'connected'; expiresAt: string }
  // The authorization was revoked or ran out.
  | { kind: 'expired' }
  | { kind: 'needs_membership'; membershipUrl: string }
  // The service could not confirm the connection just now, such as when it fails or limits calls.
  | { kind: 'unknown'; message: string }

export type PluginCard = {
  name: string
  title: string
  summary: string
  icon: string
  status: PluginStatus
}

// The start of a device-code authorization: the user confirms on the service's own page.
export type ConnectStart = {
  userCode: string
  verificationUri: string
  // Seconds between polls, and until the code expires.
  interval: number
  expiresIn: number
}

export type PollResult = { status: 'pending' | 'connected' | 'expired' }
