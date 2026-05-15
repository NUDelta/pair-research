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
- Prisma for app data
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

## Development

For local setup, environment variables, Cloudflare Wrangler login, testing, preview, and deployment notes, see [DEVELOPMENT.md](./DEVELOPMENT.md).

For code organization, contribution rules, file size guidelines, comments, TSDoc, and testing expectations, see [CONTRIBUTING.md](./CONTRIBUTING.md).

For the stable app structure, runtime boundaries, and data flow, see [ARCHITECTURE.md](./ARCHITECTURE.md).

Quick start:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The local development server runs on `http://localhost:3000/`.

Before opening a pull request, run:

```bash
pnpm run lint:fix
pnpm test
pnpm preview
```
