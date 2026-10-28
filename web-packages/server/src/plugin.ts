import type { PluginStatus } from '@gamma-reader-plug/shared/plugins'
import type { Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import type { ManifestTool } from './protocol.js'

// A refusal whose message is meant for the user: the reader hands it to the model as the tool's
// error, and the plug's page shows it.
export class PluginError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message)
  }
}

// One service the plug connects. It keeps its credential in its own sealed cookie, so it is
// connected per browser.
export type Plugin = {
  name: string
  title: string
  summary: string
  // SVG markup.
  icon: string
  connected: (c: Context) => boolean
  status: (c: Context) => Promise<PluginStatus>
  // Connecting and disconnecting, mounted at /api/<name>.
  routes: Hono
  tools: readonly ManifestTool[]
  call: (c: Context, tool: string, input: unknown) => Promise<unknown>
}

export type ToolDefinition<C> = ManifestTool & {
  run: (input: unknown, credential: C) => Promise<unknown>
}

// One schema both describes a tool to the model and checks what the model sends.
export const defineTool = <S extends z.ZodType, C>(tool: {
  name: string
  description: string
  input: S
  run: (input: z.infer<S>, credential: C) => Promise<unknown>
}): ToolDefinition<C> => {
  const { $schema: _, ...parameters } = z.toJSONSchema(tool.input)
  return {
    name: tool.name,
    description: tool.description,
    parameters,
    run: async (input, credential) => {
      const parsed = tool.input.safeParse(input)
      if (!parsed.success) throw new PluginError(400, z.prettifyError(parsed.error))
      return tool.run(parsed.data, credential)
    },
  }
}

// A plugin's tools as the manifest lists them, and the call that runs one with the browser's
// credential.
export const toolset = <C>(
  definitions: readonly ToolDefinition<C>[],
  credential: (c: Context) => C | null,
  notConnected: string,
): Pick<Plugin, 'tools' | 'call'> => ({
  tools: definitions.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  })),
  call: async (c, name, input) => {
    const tool = definitions.find(definition => definition.name === name)
    if (!tool) throw new PluginError(404, `There is no tool named ${name}.`)
    const held = credential(c)
    if (!held) throw new PluginError(401, notConnected)
    return tool.run(input, held)
  },
})
