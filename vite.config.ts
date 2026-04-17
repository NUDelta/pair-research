/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const isVitest = mode === 'test' || process.env.VITEST === 'true'
  const disableRemoteBindings = process.env.PAIR_RESEARCH_DISABLE_REMOTE_BINDINGS === '1'

  return {
    resolve: {
      tsconfigPaths: true,
      alias: isVitest
        ? {
            'cloudflare:workers': fileURLToPath(new URL('./tests/mocks/cloudflare-workers.ts', import.meta.url)),
          }
        : undefined,
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
    },
    plugins: [
      devtools(),
      ...isVitest
        ? []
        : [cloudflare({
            viteEnvironment: { name: 'ssr' },
            ...(disableRemoteBindings ? { remoteBindings: false } : {}),
          })],
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup/vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', '.output/**', 'dist/**'],
      clearMocks: true,
      restoreMocks: true,
    },
  }
})
