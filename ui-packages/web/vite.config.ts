import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backend = process.env.PLUG_BACKEND ?? 'http://127.0.0.1:3304'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  server: {
    port: Number(process.env.PLUG_WEB_PORT ?? 5304),
    strictPort: true,
    // The server answers the reader's preflights; Vite's own answer would leave out credentials.
    cors: false,
    // The page's API, and what the reader asks of the plug, both reach the server through here.
    proxy: Object.fromEntries(
      ['/api', '/manifest', '^/[a-z][a-z0-9-]*/tools/'].map(path => [
        path,
        { target: backend, changeOrigin: true },
      ]),
    ),
  },
})
