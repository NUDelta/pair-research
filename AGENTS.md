# AGENTS.md

Use this file as the working contract for future Codex runs in this repository. Inspect first, then change. Prefer small, coherent edits that match the existing TanStack Start structure instead of broad cleanup passes.

## Repo Overview

- This is a TanStack Start + Vite application, not a Next.js app. Some older docs and GitHub templates still mention `src/app` or Next.js; treat those as stale.
- Runtime and tooling:
  - React 19 + TypeScript
  - Vite + `@tanstack/react-start`
  - Tailwind CSS v4 with shadcn/ui-based components in `src/shared/ui`
  - Prisma with generated client output in `prisma/generated/client`
  - Supabase for auth, realtime, and storage
  - Vitest + Testing Library for unit/component tests
  - Playwright for smoke e2e
- Package manager: `pnpm`

## Source Layout

- `src/routes`: file-based TanStack Router routes. `/_authed` gates authenticated pages. Keep route files focused on routing, loaders, and page composition.
- `src/features`: domain code by feature.
  - `auth`: login/signup flows, redirect helpers, current-user lookups
  - `account`: profile editing and avatar upload flow
  - `groups`: the main product surface; includes create/detail UI, pairing logic, realtime hooks, schemas, and server mutations
  - `home`: marketing/homepage UI
- `src/shared`: cross-feature code only.
  - `config`: env/constants
  - `supabase`: browser/server/service-role clients
  - `lib`: generic helpers and Prisma client
  - `ui`: shadcn/ui-based components
  - `components`: layout/branding components
- `tests/setup`: Vitest test setup
- `e2e`: Playwright smoke coverage
- `prisma/schema.prisma`: canonical Prisma schema
- `src/routeTree.gen.ts` and `prisma/generated/client/**`: generated files; do not hand-edit unless the task is explicitly about generated output

## Architecture Expectations

- Prefer feature-local code over expanding `src/shared`. If logic is only used by `groups`, keep it under `src/features/groups`.
- Keep UI and domain logic separated:
  - route files compose pages and loaders
  - `createServerFn` modules own server-side reads/writes
  - client components call server functions through `useServerFn`
  - schemas and parsing helpers stay close to the feature that owns them
- Preserve existing alias usage (`@/...`) and current naming style.
- Remove dead imports or clearly obsolete code when already in scope, but do not turn a focused fix into a repo-wide cleanup.

## Server, Client, and Secrets

- Be strict about Supabase boundaries:
  - `src/shared/supabase/client.ts` is browser-only and uses `VITE_*` publishable env
  - `src/shared/supabase/server.ts` is for request-scoped server auth/session work
  - `src/shared/supabase/serviceRole.ts` is server-only and only for admin flows such as user creation/invites
- Never leak `SUPABASE_SECRET_KEY`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, or raw `process.env` access into client code.
- `src/shared/lib/prismaClient.ts` is server-only. Do not import Prisma directly into client-rendered modules.
- Auth redirect behavior is intentional. Preserve the sanitized `next` redirect flow when touching auth or protected routes.

## Groups Feature Guidance

- `src/features/groups` is the highest-risk area in this repo.
- The detail page combines:
  - route loader data from server functions
  - local optimistic-ish UI state
  - Supabase realtime subscriptions
  - router invalidation to reconcile back to server truth
- When changing group detail behavior, preserve the current pattern:
  - loader provides authoritative initial data
  - realtime hooks patch local state for responsiveness
  - router invalidation refreshes on pairing or other server-truth transitions
- Be careful with task lifecycle fields such as `pairing_id` and `delete_pending`; they drive both UI state and realtime behavior.
- Pairing logic in `src/features/groups/lib/pairing.ts` and related server mutations should be changed with tests. Small algorithm tweaks can have large product effects.

## Database and Schema Safety

- Prisma is configured against a Supabase-backed Postgres database with `public` and `auth` schemas.
- Do not hand-edit `prisma/generated/client/**`.
- If you change `prisma/schema.prisma`, regenerate the client with `pnpm run prisma:generate`.
- Treat schema changes as high-risk:
  - keep them tightly scoped
  - avoid casual reshaping of Supabase-managed/auth-backed tables
  - check related server functions and selectors for drift

## Validation Commands

- Relevant day-to-day commands:
  - `pnpm run typecheck`
  - `pnpm run lint`
  - `pnpm run test:unit`
  - `pnpm run test:e2e`
  - `pnpm run build`
- Husky already enforces:
  - pre-commit: `npx nano-staged` and `pnpm run typecheck`
  - pre-push: `pnpm run lint:fix`, `pnpm run typecheck`, `pnpm run test`, `pnpm build`
- Repository-level expectation: after modifying JS/TS files, run `pnpm test` when tests are available. If e2e is blocked by the known smoke issue below, still run the relevant unit tests and note the e2e result explicitly.

## Testing Expectations

- Prefer focused Vitest coverage near the code you touched. This repo already keeps many tests adjacent to feature files.
- Add or update tests when you change:
  - pairing logic
  - realtime hooks
  - input validation/parsing
  - route-level behavior with auth or redirects
- For UI-only copy/layout tweaks, tests are optional unless behavior or accessibility changes.
- Known caveat: `pnpm run test:e2e` currently has at least one unrelated smoke-test failure in `e2e/anonymous/smoke.spec.ts` around the homepage `Sign in` assertion. Do not assume unrelated feature work caused that failure unless you changed the landing page or auth surface.

## Change Scope Rules

- Inspect the relevant feature files before editing. Do not start by reshaping the repo.
- Keep changes tightly scoped to the feature or bug being addressed.
- Avoid broad refactors unless explicitly requested.
- Preserve current behavior unless the task is a bug fix or behavior change.
- If a helper is only useful in one feature, keep it there instead of promoting it to `shared`.

## Commits and Branches

- Keep commits small, coherent, and scoped to one logical change.
- Prefer conventional commits such as:
  - `feat(groups): ...`
  - `fix(groups): ...`
  - `refactor(groups): ...`
  - `test(groups): ...`
  - `chore(groups): ...`
- Do not mix unrelated UI cleanup, schema changes, and feature logic changes in a single commit unless they are inseparable.

- When work naturally separates, use multiple commits instead of one large catch-all commit.
- Each commit message should make sense on its own, and commit bodies should use short bullet points for the important changes.

- Do not assume `main` is always the correct base branch.
- Use the branch requested in the task or the current active integration branch.
- This repo may use long-lived refactor branches such as `refactor/react` as the active base for ongoing work.

- For local integration work, prefer a normal merge over rebasing or rewriting history unless there is a concrete reason not to.
- When renaming or merging branches, report exactly what was renamed, what was merged, and the resulting local branch state.

- Before presenting work as ready, state clearly:
  - what commits were created
  - what branch the work is on
  - what validation passed
  - whether any known unrelated failures remain
