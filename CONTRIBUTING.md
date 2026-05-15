# Contributing Guide

This guide describes how to structure code changes in this repository. For local setup, environment variables, testing commands, and deployment details, see [`DEVELOPMENT.md`](./DEVELOPMENT.md).

For stable app structure, runtime boundaries, and data flow, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Code Organization

Keep UI, hooks, domain logic, schemas, and server-side behavior separated as features grow. Small files can stay simple, but split responsibilities when a file becomes hard to scan or mixes unrelated concerns.

Recommended feature layout:

```text
src/features/<feature>/
  components/   UI components and feature-specific presentation
  hooks/        React hooks and client-side state coordination
  lib/          Pure logic, helpers, algorithms, and data transforms
  server/       Server functions, database access, and privileged operations
  schemas/      Validation schemas and shared input/output types
```

Not every feature needs every folder. Prefer feature-local code first; only move code to `src/shared` when it is genuinely reused across features.

## Separation of Responsibilities

### Routes

Route files should stay focused on routing, loaders, redirects, and page composition. Avoid putting complex UI, algorithms, or database logic directly in route files.

### UI Components

UI components should focus on rendering, composition, accessibility, and user interaction.

Avoid putting complex business logic, database access, or server mutations directly inside UI components. Move those concerns into feature-local hooks, `lib` files, schemas, or server modules.

As a guideline, keep individual UI component files under **300 lines**. When a component grows beyond that, consider splitting it into smaller subcomponents or moving state/logic into a hook.

### Hooks

Hooks should manage client-side state, subscriptions, derived UI state, and coordination between UI components and server functions.

Keep hooks focused. If a hook contains complex pure logic, move that logic into a `lib` file and call it from the hook. Hooks should not import server-only modules, Prisma clients, service-role Supabase clients, or secrets.

### Logic and Utilities

Pure logic should live in feature-local `lib` files unless it is reused across multiple features.

Logic files should be deterministic when possible. They should avoid React state, browser-only APIs, direct database access, and hidden side effects unless the file is explicitly responsible for those concerns.

As a guideline, keep logic/helper files under **200 lines**. When a logic file grows beyond that, split it by responsibility, such as parsing, scoring, pairing, filtering, formatting, or validation.

### Schemas and Types

Validation schemas should stay close to the feature or server function that owns the data boundary. Shared schemas are appropriate when the same input/output contract is used across multiple modules.

Prefer explicit types for exported functions, hooks, and reusable objects. Avoid relying on inferred types when the exported API is part of a feature boundary.

### Server Code

Server code should own database access, privileged Supabase operations, validation before writes, and server-only environment variables.

Do not import server-only modules into client-rendered code. In particular, do not expose `DATABASE_URL`, `SUPABASE_SECRET_KEY`, Prisma, or service-role Supabase clients to the browser.

## Comments and TSDoc

Use comments and TSDoc to explain important intent, constraints, and non-obvious behavior. Do not add comments that simply restate what the code already says.

Add comments or TSDoc for:

- non-obvious algorithms
- security-sensitive logic
- auth, redirect, or permission checks
- realtime synchronization behavior
- pairing logic
- data transformations with assumptions
- reusable helpers used across files or features

### TSDoc Expectations

For small local helpers, a short comment is usually enough.

For reusable exported functions, hooks, types, constants, or config objects, prefer TSDoc. The more widely reused or domain-specific the API is, the more complete the TSDoc should be.

Good TSDoc should usually explain:

- what the function, hook, type, or value is for
- important assumptions or constraints
- what parameters represent when not obvious
- what is returned
- side effects, if any
- one short example when usage is easy to misuse

Do **not** write long TSDoc for every variable, prop, or obvious value. Document each value in detail only when the values encode domain meaning, security assumptions, user-visible behavior, or constraints that are easy to misuse.

For reusable constants, enums, or config objects, include more detailed value-level documentation when the values are not self-explanatory.

Example:

````ts
/**
 * Builds pair assignments for a group round from member help ratings.
 *
 * The function prefers stable pairings when possible, then falls back to
 * maximum-weight matching for unmatched members. It does not write to the
 * database; callers are responsible for persisting the returned pairs.
 *
 * @param members - Members eligible for the current pairing round.
 * @param ratings - Directed help ratings between members.
 * @returns Pair assignments and any unmatched member IDs.
 *
 * @example
 * ```ts
 * const result = buildPairs(members, ratings);
 * await savePairingRound(result.pairs);
 * ```
 */
export function buildPairs(
  members: Member[],
  ratings: HelpRating[]
): {
  pairs: Pair[]
  unmatchedMemberIds: string[]
} {
  // ...
  return { pairs, unmatchedMemberIds }
}
````

## File Size Guidelines

Use these as guidelines, not hard limits:

- UI component files: aim for **under 300 lines**
- logic/helper files: aim for **under 200 lines**
- hooks: keep focused; split when state coordination becomes hard to follow
- server files: split by operation or domain when reads, writes, and validation become mixed

Going over the guideline is acceptable when splitting would make the code less clear, but large files should be intentional.

## Testing Expectations

Add or update tests when changing:

- pairing logic
- realtime behavior
- auth or redirect behavior
- server mutations
- validation schemas
- reusable logic in `lib`

For copy-only or visual-only changes, tests are optional unless behavior, accessibility, or user flow changes.

Prefer focused tests near the code being changed. Avoid unrelated snapshot churn or broad test rewrites unless the task explicitly requires it.

## Pull Request Checklist

Before opening a pull request, make sure the change is scoped and understandable:

- UI, hooks, logic, schemas, and server behavior are separated when appropriate
- large files were split or intentionally kept together
- important logic has comments or TSDoc
- generated files were not hand-edited
- relevant tests were added or updated
- relevant validation commands were run, or skipped commands are clearly explained
- architecture or workflow documentation was updated when the change affected stable project behavior
