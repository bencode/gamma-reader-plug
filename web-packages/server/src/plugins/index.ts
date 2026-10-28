import type { PlugConfig } from '../config.js'
import type { Plugin } from '../plugin.js'
import { createGetnote } from './getnote/index.js'

export const createPlugins = (config: PlugConfig): Plugin[] => [
  createGetnote({ plugOrigin: config.plugOrigin, secret: config.secret }),
]
