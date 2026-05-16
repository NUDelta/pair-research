# AGENTS.md

Use this file as the working contract for future Codex runs in this repository. Inspect first, then change. Prefer small, coherent edits that match the existing TanStack Start structure instead of broad cleanup passes.

## Related Docs

- [`README.md`](./README.md): project overview, product behavior, tech stack, routes, and quick development entry point.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): stable app structure, routing and feature organization, runtime boundaries, and data flow.
- [`DEVELOPMENT.md`](./DEVELOPMENT.md): local setup, VS Code extensions, environment variables, Wrangler login, testing commands, preview, and deployment.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md): code organization, UI/hooks/logic/server separation, file size guidelines, comments, TSDoc, and testing expectations.

Agents should follow `CONTRIBUTING.md` unless the user explicitly asks for a different structure.

## Repo Overview

- This is a TanStack Start + Vite application, not a Next.js app. Treat older references to `src/app` or Next.js as stale unless the task specifically asks about legacy docs.
- The app uses React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components, Prisma, Supabase, Cloudflare Workers, Cloudflare Durable Objects, Cloudflare R2, Vitest, Testing Library, and Playwright.
- Package manager: `pnpm`.

## Source Layout

- `src/routes`: file-based TanStack Router routes. `/_authed` gates authenticated pages. Keep route files focused on routing, loaders, redirects, and page composition.
- `src/features`: domain code by feature.
  - `auth`: login/signup flows, redirect helpers, and current-user lookups.
  - `account`: profile editing and avatar upload flow.
  - `groups`: main product surface, including create/detail UI, pairing logic, realtime hooks, schemas, and server mutations.
  - `home`: public homepage UI.
- `src/shared`: cross-feature code only.
  - `config`: environment constants and app configuration.
  - `supabase`: browser, server, and service-role Supabase clients.
  - `lib`: generic helpers and Prisma client.
  - `ui`: shadcn/ui-style primitives.
  - `components`: layout and branding components.
- `tests/setup`: Vitest test setup.
- `e2e`: Playwright coverage.
- `prisma/schema.prisma`: canonical Prisma schema.
- `src/routeTree.gen.ts`, `cloudflare-env.d.ts`, and `prisma/generated/client/**`: generated files. Do not hand-edit them unless the task is explicitly about generated output.

## Architecture Expectations

- Keep UI, hooks, pure logic, schemas, and server code separated according to `CONTRIBUTING.md`.
- Prefer feature-local code over expanding `src/shared`. If logic is only used by one feature, keep it in that feature.
- Keep route files focused on routing, loaders, redirects, and page composition.
- Keep client components focused on UI and interaction. Move complex state coordination into hooks and pure logic into `lib` files.
- Keep server functions responsible for database access, privileged operations, and validation before writes.
- Preserve existing alias usage (`@/...`) and current naming style.
- Remove dead imports or clearly obsolete code when already in scope, but do not turn a focused fix into a repo-wide cleanup.

## Server, Client, and Secrets

- Be strict about Supabase boundaries:
  - `src/shared/supabase/client.ts` is browser-only and uses `VITE_*` publishable environment variables.
  - `src/shared/supabase/server.ts` is for request-scoped server auth/session work.
  - `src/shared/supabase/serviceRole.ts` is server-only and only for admin flows such as user creation or invites.
- Never leak `SUPABASE_SECRET_KEY`, `DATABASE_URL`, Prisma clients, service-role Supabase clients, or raw server environment access into client-rendered code.
- `src/shared/lib/prismaClient.ts` is server-only. Do not import Prisma directly into client-rendered modules.
- Auth redirect behavior is intentional. Preserve the sanitized `next` redirect flow when touching auth or protected routes.

## Groups Feature Guidance

- `src/features/groups` is the highest-risk area in this repo.
- The group detail page combines route loader data, local optimistic UI state, Durable Object realtime sessions, and router invalidation back to server truth.
- When changing group detail behavior, preserve the current pattern:
  - loaders provide authoritative initial data
  - realtime hooks subscribe to the per-group Durable Object WebSocket for responsiveness
  - router invalidation reconciles pairing and other server-truth transitions
- Be careful with task lifecycle fields such as `pairing_id` and `delete_pending`; persisted rows still use them, but realtime task removal is coordinated by the group Durable Object rather than Supabase Realtime.
- Pairing logic in `src/features/groups/lib/pairing` and related server mutations should be changed with tests. Small algorithm tweaks can have large product effects.

## Database and Schema Safety

- Prisma is configured against a Supabase-backed Postgres database with `public` and `auth` schemas.
- Do not hand-edit `prisma/generated/client/**`.
- If you change `prisma/schema.prisma`, regenerate the client with `pnpm run prisma:generate`.
- Treat schema changes as high-risk:
  - keep them tightly scoped
  - avoid casual reshaping of Supabase-managed or auth-backed tables
  - check related server functions and selectors for drift

## Validation and Testing

- Follow the command guidance in `DEVELOPMENT.md`.
- Run the most relevant validation for the files changed. For JS/TS behavior changes, run tests when available.
- Add or update tests when changing pairing logic, realtime hooks, auth/redirect behavior, server mutations, validation schemas, or reusable logic.
- For UI-only copy/layout tweaks, tests are optional unless behavior, accessibility, or user flow changes.
- If a validation command fails, report the command, the failure, and whether it appears related to the current change. Do not hide unrelated failures.

## Change Scope Rules

- Inspect the relevant feature files before editing. Do not start by reshaping the repo.
- Keep changes tightly scoped to the feature or bug being addressed.
- Avoid broad refactors unless explicitly requested.
- Preserve current behavior unless the task is a bug fix or behavior change.
- Update related documentation when a change affects stable architecture, setup, workflow, or user-facing behavior.
- If a helper is only useful in one feature, keep it there instead of promoting it to `shared`.
- Avoid mixing unrelated UI cleanup, schema changes, and feature logic changes in one change unless they are inseparable.

## Commits and Branches

- Keep commits small, coherent, and scoped to one logical change.
- Prefer conventional commits such as:
  - `feat(groups): ...`
  - `fix(groups): ...`
  - `refactor(groups): ...`
  - `test(groups): ...`
  - `chore(groups): ...`
- When work naturally separates, use multiple commits instead of one large catch-all commit.
- Do not assume `main` is always the correct base branch. Use the branch requested in the task or the current active integration branch.
- For local integration work, prefer a normal merge over rebasing or rewriting history unless there is a concrete reason not to.

Before presenting work as ready, state clearly:

- what branch the work is on
- what commits were created, if any
- what validation passed
- what validation was not run and why
- whether any known or unrelated failures remain
