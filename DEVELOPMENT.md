# Development Guide

This guide explains how to set up, develop, test, preview, and deploy the Pair Research app. It is intended to keep the development workflow consistent across contributors.

For code organization, contribution rules, file size guidelines, comments, TSDoc, and testing expectations, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Overview

The app uses:

- Node.js >= 22
- pnpm for package management
- Cloudflare Workers for deployment
- Cloudflare Durable Objects for group pairing realtime coordination
- Cloudflare R2 for storage
- Wrangler for local Cloudflare development and deployment

Environment variables are managed separately from the repository. Do not commit secrets or local environment files.

## 1. Prerequisites

### Node.js

Make sure Node.js >= 22 is installed:

```bash
node --version
```

If Node.js is not installed, or if your version is too old, install the LTS version from the official Node.js website:

[https://nodejs.org/en/download](https://nodejs.org/en/download)

Using a Node version manager such as `nvm` is recommended if you work across multiple projects.

### pnpm

Check whether pnpm is available:

```bash
pnpm --version
```

If pnpm is not available, enable it through Corepack:

```bash
corepack enable pnpm
```

If this does not work, follow the official pnpm installation guide:

[https://pnpm.io/installation](https://pnpm.io/installation)

### Recommended VS Code Extensions

This repository includes recommended VS Code extensions for a better development experience, such as linting, formatting, and framework-related tooling.

If you open the project in VS Code for the first time, VS Code may prompt you to install the recommended extensions. You can also install them manually:

1. Open the Extensions panel in VS Code.
2. Search for `@recommended`.
3. Install the workspace-recommended extensions.

These recommendations are defined in `.vscode/extensions.json`.

## 2. Install Dependencies

From the project root directory, install dependencies with pnpm:

```bash
pnpm install
```

You can also use the shorter alias:

```bash
pnpm i
```

## 3. Log In to Cloudflare Wrangler

This project uses Cloudflare Workers for deployment and R2 for storage. To run Cloudflare-related development commands locally, you need to be logged in with Wrangler.

Run:

```bash
pnpm wrangler login
```

You must log in with the DTR Cloudflare account, not a personal Cloudflare account. Otherwise, you may not have access to the correct R2 bucket and related Cloudflare resources.

If you encounter credential or permission issues later, run the same command again to relogin.

## 4. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then open `.env` and fill in the required values. The comments in `.env.example` explain what each value is used for and how to obtain it.

### Environment Variable Rules

This project uses both **variables** and **secrets**.

- **Variables** are non-sensitive values stored in the `"vars"` section of `wrangler.jsonc`. These values are committed to the repository and are available to the Cloudflare Worker runtime.
- **Secrets** are sensitive values and must not be stored in `wrangler.jsonc`. For local development, add them to `.env`. For deployed Cloudflare environments, add any missing remote secrets with:

```bash
pnpm wrangler secret put SECRET_NAME
```

After adding, removing, renaming, or changing any variable or secret used by the codebase, regenerate the Cloudflare environment types:

```bash
pnpm cf-typegen
```

This keeps the generated bindings in sync with the environment values expected by the application.

### Cloudflare Bindings

`wrangler.jsonc` defines the runtime bindings used by the Worker:

- `R2_BUCKET` stores uploaded avatar objects.
- `GROUP_SESSIONS` is a Durable Object namespace. The app uses one `GroupSessionDO` instance per group ID to coordinate active pool tasks, ratings, pair creation, reset events, and realtime WebSocket fan-out. Active pool task and rating edits are staged in Durable Object SQLite storage first; Postgres persistence happens when the pairing is created or the pool is reset.

When adding or renaming a binding, update `wrangler.jsonc`, run `pnpm cf-typegen`, and verify the generated `cloudflare-env.d.ts` change.

## 5. Start the Development Server

Start the local development server:

```bash
pnpm dev
```

Then open:

```plaintext
http://localhost:3000/
```

## 6. Preview the Production Build

To build and preview the production version locally, run:

```bash
pnpm preview
```

Then open:

```plaintext
http://localhost:4000/
```

Use this when you want to check behavior closer to the deployed production build.

## 7. Linting and Formatting

Auto-formatting on save and commit is already configured. Make sure the recommended VS Code extensions are installed so linting and formatting feedback appears during development.

To manually lint and fix issues, run:

```bash
pnpm run lint:fix
```

## 8. Testing

Run all tests:

```bash
pnpm test
```

Run only unit tests:

```bash
pnpm test:unit
```

Use this for logical changes, utility functions, algorithms, and non-UI behavior.

Run only end-to-end tests:

```bash
pnpm test:e2e
```

Use this for route-level behavior, public page smoke tests, and user-facing flows.

Authenticated e2e tests require `PLAYWRIGHT_AUTH_EMAIL` and `PLAYWRIGHT_AUTH_PASSWORD`:

```bash
pnpm test:e2e:auth
```

## 9. Prisma and Generated Files

If you change the Prisma schema, regenerate the Prisma client:

```bash
pnpm run prisma:generate
```

Generated files should not be edited by hand. This includes:

- `src/routeTree.gen.ts`
- `cloudflare-env.d.ts`
- `prisma/generated/client/**`

If generated files are out of sync, rerun the relevant generation command instead of manually editing them.

## 10. Useful Scripts

- `pnpm dev` starts the app locally
- `pnpm dev:e2e` starts a local server for Playwright
- `pnpm build` builds the app for production
- `pnpm preview` previews the production build locally
- `pnpm lint` runs ESLint
- `pnpm run lint:fix` runs ESLint and applies safe fixes
- `pnpm test:unit` runs Vitest tests
- `pnpm test:e2e` runs Playwright smoke tests
- `pnpm test:e2e:auth` runs authenticated Playwright tests
- `pnpm test` runs unit tests and e2e tests
- `pnpm deploy` builds and deploys with Wrangler

## 11. Deployment

The app deploys to Cloudflare Workers with Wrangler:

```bash
pnpm deploy
```

Before deploying, make sure:

- Wrangler is authenticated with the DTR Cloudflare account
- required variables are defined in `wrangler.jsonc`
- required secrets are configured in the target Cloudflare environment
- the `R2_BUCKET` binding exists and points to the correct bucket
- the `GROUP_SESSIONS` Durable Object binding and its migration are present in `wrangler.jsonc`
- `pnpm cf-typegen` has been run after any environment changes

## Recommended Before Opening a PR

Before opening a pull request, run:

```bash
pnpm run lint:fix
pnpm test
pnpm preview
```

This helps catch linting issues, test failures, and production-preview problems before CI.
