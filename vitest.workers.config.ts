import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [cloudflareTest({ wrangler: { configPath: './tests/runtime/wrangler.jsonc' } })],
  test: {
    include: ['tests/runtime/**/*.worker.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
