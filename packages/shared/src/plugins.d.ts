// What the plug's own page and its server say to each other.

export type PluginStatus =
  | { kind: 'disconnected' }
  | { kind: 'connected' }
  // The API Key was deleted, or stopped working.
  | { kind: 'invalid' }
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
