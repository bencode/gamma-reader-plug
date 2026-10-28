// The reader's plugin protocol, as Gamma Reader's docs/plugins.md describes it.

export type ManifestTool = {
  name: string
  description: string
  // A JSON Schema of an object.
  parameters: Record<string, unknown>
}

// GET /manifest: the plugins this browser has connected.
export type PluginManifest = {
  plugins: {
    name: string
    title: string
    // An absolute URL.
    icon: string
    tools: ManifestTool[]
  }[]
}

// What a tool call answers with when it fails.
export type ToolRefusal = { error: { message: string } }
