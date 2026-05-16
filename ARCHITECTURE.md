# Architecture

This document describes the stable structure of the Pair Research app. It is meant to help maintainers understand where code belongs, how data moves through the app, and why the project is organized this way.

For local setup, commands, and deployment notes, see [`DEVELOPMENT.md`](./DEVELOPMENT.md). For contribution rules and code organization guidelines, see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Overview

Pair Research is a TanStack Start application deployed as a Cloudflare Worker. The browser renders React routes and components. Server functions, route loaders, Supabase session helpers, Prisma, and Cloudflare bindings handle the privileged work that should not run in the browser.

At a high level:

- TanStack Router owns file-based routing and route loading.
- Feature folders own domain-specific UI, hooks, schemas, logic, and server functions.
- Supabase owns authentication sessions.
- Prisma owns application database reads and writes against the Supabase-backed Postgres database.
- Cloudflare Workers host the app.
- Cloudflare Durable Objects coordinate group pairing realtime sessions.
- Cloudflare R2 stores uploaded avatar objects.

## App Structure

```text
src/
  routes/      TanStack Router route files, loaders, redirects, and page entry points
  features/    Domain code grouped by product area
  shared/      Cross-feature UI, config, server helpers, styles, and utilities
prisma/        Prisma schema and generated client
e2e/           Playwright end-to-end tests
tests/         Vitest setup and shared test support
```

The important rule is ownership. Route files should compose pages and enforce route-level behavior. Feature folders should own product behavior. Shared code should stay small and reusable across more than one feature.

## Routing and Features

Routes live in `src/routes` and follow TanStack Router file-based routing. Public routes include the home page, auth pages, legal pages, and auth callback routes. Authenticated routes live under `/_authed`, which checks the current Supabase user before allowing access.

Route files should stay focused on:

- route definitions
- loaders and redirects
- route-level auth checks
- page composition

Most user-facing behavior belongs in `src/features`:

```text
src/features/<feature>/
  components/   Feature-specific UI
  hooks/        Client-side state coordination and subscriptions
  lib/          Pure logic, algorithms, formatting, and data transforms
  server/       Server functions, database access, and privileged operations
  schemas/      Validation schemas and shared boundary types
```

Not every feature needs every folder. Keep code feature-local until it is genuinely reused. This avoids a large shared layer where ownership becomes unclear.

## Auth and Data Flow

Supabase Auth is the source of truth for user identity. The app uses two Supabase clients for different runtime boundaries:

- `src/shared/supabase/client.ts` creates the browser client from public Supabase environment variables.
- `src/shared/supabase/server.ts` creates the request-scoped server client and reads or updates auth cookies through TanStack Start server helpers.

Authenticated routes call server-side auth helpers before rendering protected pages. If no user is available, the route redirects to login with a sanitized `next` value so the user can return after signing in.

Application data is read and written through server functions. Server functions validate input, check permissions, use Prisma for database access, and return only the data needed by the UI.

The usual flow is:

1. A route loader or UI action calls a feature server function.
2. The server function gets the current user from Supabase when identity is needed.
3. The server function validates input and checks group membership or role permissions.
4. Prisma reads or writes application data in Postgres.
5. The route or component receives a safe response and updates the UI.

## Supabase, Prisma, Cloudflare, and R2

These tools have separate responsibilities:

- Supabase Auth manages users, sessions, auth cookies, password reset, OAuth, and invitations.
- Supabase Postgres stores the application data.
- Prisma provides the typed database client used by server code.
- Cloudflare Workers run the TanStack Start server output in production.
- Cloudflare Durable Objects provide one realtime coordination object per group for active pool tasks, ratings, pairing creation, and WebSocket fan-out.
- Cloudflare R2 stores avatar image objects.

Prisma connects to the same Postgres database that Supabase backs. Supabase Auth still owns auth-managed user identity, while Prisma owns application tables such as profiles, groups, members, tasks, ratings, pairings, and roles.

R2 is used for file storage, not relational state. Server code writes and deletes objects through Cloudflare bindings, then stores or returns public image URLs for the UI.

## Frontend and Server Boundary

Browser code can use:

- React components and hooks
- public `VITE_*` environment variables
- the browser Supabase client
- feature-local pure logic and schemas
- shared UI and generic utilities

Server code can use:

- Prisma
- server-only environment variables
- service-role Supabase operations
- Cloudflare bindings such as R2 and Durable Object namespaces
- privileged permission checks and database mutations

Do not import server-only modules into client-rendered code. In particular, Prisma, service-role Supabase clients, `DATABASE_URL`, `SUPABASE_SECRET_KEY`, and raw Cloudflare bindings must stay behind server functions or server-only helper modules.

The project uses small wrapper modules for some server-only services. This keeps imports ergonomic while preserving the actual runtime boundary in `.server.ts` files.

## Important Module Interactions

### Auth

Auth pages render forms from `src/features/auth/components`. Those forms call auth server functions in `src/features/auth/server`. Auth helpers normalize redirect behavior and profile data so routes and UI components do not duplicate session logic.

### Account and Avatars

The account feature owns profile editing and avatar updates. Client-side components handle form interaction and image selection. Server functions validate profile updates, optimize or resolve avatar changes when needed, store avatar objects in R2, and persist the resulting profile state through Prisma.

### Groups

The groups feature is the main product surface. It combines route loader data, local UI state, server mutations, Durable Object realtime sessions, and router invalidation.

Group pages follow this pattern:

- loaders provide the initial authoritative state
- components render the current group, tasks, ratings, members, and active pairing
- hooks subscribe to the group session WebSocket for task, rating, pairing, and reset events
- server functions validate input and route privileged group pairing writes to the per-group Durable Object
- router invalidation reconciles local state with server truth after important transitions

Pairing logic lives under `src/features/groups/lib/pairing`. It is pure application logic and should stay separated from database writes. The group Durable Object prepares active pool data, calls the pairing logic, and persists the resulting round.

### Shared UI and Layout

Shared layout, branding, UI primitives, styles, and error pages live in `src/shared`. These modules should not know about group-specific or auth-specific behavior. Feature-specific presentation should stay in the feature that owns it.

## Why the Project Is Structured This Way

The app has several boundaries that need to stay clear:

- public pages versus authenticated product pages
- browser-safe code versus server-only code
- reusable UI primitives versus feature-specific UI
- pure pairing logic versus database persistence
- Supabase auth versus Durable Object realtime coordination and Prisma application data access
- Cloudflare runtime bindings versus local development helpers

Keeping these responsibilities separated makes the codebase easier to maintain. It reduces accidental secret leaks, keeps route files readable, makes feature behavior easier to test, and lets the pairing algorithm evolve without coupling it to UI or database details.

When adding new behavior, prefer the smallest place that owns the responsibility. Add shared abstractions only after more than one feature has the same need.

## Documentation Maintenance

Update this document when a change affects a stable architectural boundary, such as routing strategy, feature ownership, auth flow, data access, storage, deployment runtime, or frontend/server separation.

Do not update this document for every small component, copy, style, or helper change. Prefer documenting stable patterns and responsibilities instead of details that are expected to change often.
