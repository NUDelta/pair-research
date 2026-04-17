# Pair Research

[Pair Research](http://users.eecs.northwestern.edu/~hq/papers/pairresearch.pdf) is a group collaboration method developed by Miller, Zhang, Gilbert, and Gerber to pair members together each round so they can work through one another’s blockers and projects. Based on the original Pair Research method from Delta Lab, this application extends the earlier Google Sheets and spreadsheet-based workflow into a full web app where users can create customized groups, generate pairings, view analytics, and support collaboration across specific subgroups, such as professors and students in a research lab.

## What the app does

- lets people create and join groups
- tracks each member's current task
- collects "how much can I help?" ratings between members
- builds pairings for the current round
- shows live group updates in realtime
- supports group settings, roles, invitations, and profile avatars

## Tech stack

- TanStack Start + Vite
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Prisma for app data (orm)
- Supabase for auth and realtime
- Cloudflare Workers for deployment
- Cloudflare R2 for avatar storage
- Cloudflare Turnstile for bot protection
- Vitest + Testing Library for unit and component tests
- Playwright for end-to-end tests

## Project structure

```text
src/
  routes/      Route files and page entry points
  features/    Feature code by domain
    auth/      Sign in, sign up, password reset, redirects
    account/   Profile editing and avatar upload
    groups/    Group creation, invites, tasks, pairing, settings
    home/      Public landing page
  shared/      Shared UI, config, server helpers, styles
prisma/        Prisma schema and generated client
e2e/           Playwright tests
tests/         Test setup and mocks
```

## Main routes

- `/` public home page
- `/login` sign in
- `/signup` sign up
- `/forgot-password` request password reset
- `/reset-password` set a new password from the reset link
- `/groups` list joined and pending groups
- `/groups/create` create a group
- `/groups/$slug` active group page
- `/groups/$slug/settings` group settings
- `/account` profile and avatar settings

## Pairing flow

Each member adds a task for the current round and rates how much they can help on other members' tasks. The app uses those ratings to build pairings.

The pairing code lives under `src/features/groups/lib/pairing`. It tries a stable-roommates pass first, then fills any remaining unmatched people with maximum-weight matching. This keeps pairings stable when possible and still gives good results for hard or odd-sized pools.

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

### Required

- `VITE_SUPABASE_URL` public Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` public Supabase browser key
- `DATABASE_URL` Postgres connection string for Prisma
- `SUPABASE_SECRET_KEY` server-only Supabase secret for admin actions
- `VITE_SITE_BASE_URL` public site URL used for links and auth redirects
- `R2_PUBLIC_DOMAIN` public base URL for avatar files in R2
- `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` public Turnstile site key
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` server-only Turnstile secret

### Runtime binding

- `R2_BUCKET` Cloudflare R2 bucket binding configured in `wrangler.jsonc`

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The local dev server runs on `http://127.0.0.1:3000`.

If you change the Prisma schema, regenerate the client:

```bash
pnpm run prisma:generate
```

## Scripts

- `pnpm dev` start the app locally
- `pnpm dev:e2e` start a local server for Playwright
- `pnpm build` typecheck and build
- `pnpm preview` preview the production build
- `pnpm lint` run ESLint
- `pnpm typecheck` run TypeScript checks
- `pnpm test:unit` run Vitest
- `pnpm test:e2e` run Playwright smoke tests
- `pnpm test:e2e:auth` run authenticated Playwright tests
- `pnpm test` run unit tests and e2e tests
- `pnpm deploy` build and deploy with Wrangler

## Testing

For TypeScript changes, run:

```bash
pnpm test
```

Useful focused commands:

- `pnpm test:unit` for fast local feedback
- `pnpm test:e2e` for public route smoke tests
- `pnpm test:e2e:auth` for authenticated flows

Playwright uses a local server by default. Authenticated e2e tests require `PLAYWRIGHT_AUTH_EMAIL` and `PLAYWRIGHT_AUTH_PASSWORD`.

## Deployment

The app deploys to Cloudflare Workers with Wrangler.

```bash
pnpm deploy
```

Before deploying, make sure:

- the required environment variables are set
- the `R2_BUCKET` binding exists
- Wrangler is authenticated for the target Cloudflare account

## Notes

- Generated files such as `src/routeTree.gen.ts`, `cloudflare-env.d.ts`, and `prisma/generated/client/**` should not be edited by hand.
