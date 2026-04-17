# Playwright E2E

`pnpm test:e2e` runs the anonymous smoke suite against a local Vite dev server on `127.0.0.1:3000`.

By default Playwright starts its own fresh server instance. If you intentionally want to reuse an existing local server, set `PLAYWRIGHT_REUSE_EXISTING_SERVER=1`.

The anonymous suite forces a logged-out state with a test cookie so stable public-route checks do not depend on leftover storage state or Supabase session lookups.

Authenticated coverage is opt-in:

- set `PLAYWRIGHT_AUTH_EMAIL`
- set `PLAYWRIGHT_AUTH_PASSWORD`
- run `pnpm test:e2e:auth`

The auth setup project signs in through the real email/password flow and writes storage state to `e2e/.auth/user.json`. Add future authenticated specs under `e2e/authenticated`.
