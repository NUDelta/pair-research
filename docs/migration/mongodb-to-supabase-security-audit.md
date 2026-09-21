# MongoDB Atlas to Supabase Security Audit (Phase 0A)

Audit date: 2026-09-21

Scope: current application source, generated build artifacts, the live Supabase production catalog, the anonymous Data API surface, and the connected MongoDB Atlas database.

Change boundary: read-only. No production policy, privilege, configuration, or data was changed.

## Executive summary

Phase 0B should not begin until the confirmed Data API exposure and the removed-member Durable Object issue have approved fixes and tests. The current application does not query application tables through `supabase-js`; browser Supabase usage is Auth-only. Nevertheless, the live database grants every table privilege to `anon` and `authenticated`, and all nine application tables have a permissive `SELECT USING (true)` policy assigned to `PUBLIC`. A publishable-key request to `/rest/v1/profile?select=id&limit=0` returned HTTP 200, confirming that the route is reachable through the Data API without authentication.

The Worker also connects as `postgres`. That role has `BYPASSRLS`, `CREATEROLE`, and `CREATEDB`, so application authorization currently depends on every server function being correct. No current client-supplied actor-ID vulnerability was found, but several authorization lifecycle, invitation identity, rate-limit, and credential-boundary issues remain.

## Live database findings

The following was verified against project `twnurskjzrelsaptkblt` with read-only catalog queries and a zero-row Data API request.

- Application tables: `affinity`, `group`, `group_member`, `group_role`, `pair`, `pairing`, `profile`, `task`, and `task_help_capacity`.
- RLS is enabled on all nine tables, but `FORCE ROW LEVEL SECURITY` is disabled.
- Each table has a permissive `SELECT` policy named `Enable read access for all users`, assigned to `{public}`, with `USING (true)`.
- `profile` also has `PUBLIC` insert/delete policies based on `auth.uid() = id` and an update policy based on `auth.jwt()->>'email' = email`.
- `task` also has a `PUBLIC` delete policy based on `auth.uid() = user_id`.
- `anon`, `authenticated`, and `service_role` have `DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE` on all nine application tables.
- `anon`, `authenticated`, and `service_role` have `USAGE, SELECT, UPDATE` on all six public sequences.
- Default privileges for objects later created by `postgres` or `supabase_admin` in `public` grant broad table, sequence, and function access to `anon`, `authenticated`, and `service_role`.
- `service_role` and the production `postgres` application role have `BYPASSRLS`.
- No views or materialized views exist in `public`. No functions exist in `public`, and no `SECURITY DEFINER` functions were found in `public` or `auth` by the audit query.
- `anon`, `authenticated`, and `service_role` have schema `USAGE`, but not `CREATE`, on both `public` and `auth`.
- The repository contains no tracked migration that recreates the live grants, RLS policies, default privileges, functions, or views.

PostgreSQL policy roles are additive. Adding restrictive policies without removing the permissive `PUBLIC ... USING (true)` policies will not close this exposure.

## Findings

### SEC-01 — High — All application rows are anonymously queryable through the Data API

- Affected: all nine `public` application tables; live table grants, default ACLs, and the `Enable read access for all users` policies.
- Scenario: anyone with the public project URL and publishable key can query profiles, groups, memberships, tasks, pairings, pairs, affinities, and task-help capacities. RLS is enabled, but the `PUBLIC SELECT USING (true)` policy authorizes every row for every role that has `SELECT`. The app's publishable key is intentionally present in the browser.
- Recommended fix: in Phase 0B, capture a reviewed baseline migration, remove the unconditional policies, revoke all application table/sequence privileges from `anon` and `authenticated`, and revoke the corresponding default privileges. Keep the Data API enabled for Auth if required, but do not expose application tables the app never accesses through it. Replace the keepalive job before removing access.
- Tests: anonymous and authenticated publishable-key requests must receive `42501`/HTTP 401 or 403 for every application table and operation; server-side Prisma flows must continue to work; add catalog drift assertions for grants, policies, default ACLs, and exposed schemas.

### SEC-02 — High — The production runtime database role bypasses RLS and can administer the database

- Affected: `.env.example`, `src/shared/server/prisma.server.ts`, `prisma/schema.prisma`, and the live `postgres` connection role.
- Scenario: a missed server authorization check, server-side injection, or Worker compromise executes with `BYPASSRLS`, `CREATEROLE`, and `CREATEDB`. It can ignore application RLS and reach both `public` and privileged `auth` data.
- Recommended fix: provision a dedicated runtime login with only the required table/sequence DML grants, no `BYPASSRLS`, no role/database creation, no DDL, and no direct `auth` schema access. Keep separate, tightly controlled credentials for migrations and backups.
- Tests: run all Prisma flows as the runtime role; assert that `auth.users`, role changes, DDL, unrelated schemas, and RLS bypass fail; add a catalog assertion that the runtime role has no elevated role attributes.

### SEC-03 — High — A removed member can remain in Durable Object state and be paired

- Affected: `src/features/groups/server/groups/removeGroupMember.ts`, `src/durable-objects/group-session/pairing-actions.ts`, and Durable Object SQLite state.
- Scenario: membership removal cleans PostgreSQL rows but does not evict the member's live Durable Object task or ratings. Pairing consumes stored tasks without revalidating every task owner. A removed user may remain visible, be paired, and be persisted into new task, pair, or affinity rows.
- Recommended fix: add a manager-authorized eviction operation, close the user's sockets, and prune/revalidate all participant memberships immediately before committing a pairing. Serialize removal and pairing to prevent races.
- Tests: remove a member with a DO-only task and ratings; test remove-versus-pair concurrency; prove the removed UUID never appears in new tasks, pairs, affinities, or broadcasts.

### SEC-04 — High — Invitation identity can be redirected through stale `profile.email`

- Affected: live `profile` grants/policies; `prisma/schema.prisma`; `src/features/account/server/getOrCreateProfile.ts`; `src/features/groups/server/groups/groupManagement.ts`; `src/features/groups/server/groups/createGroup.ts`.
- Scenario: invitations resolve identity from mutable, non-unique `public.profile.email`, while existing profiles are not resynchronized after an Auth email change. The live `profile` update policy selects rows by JWT email rather than immutable UUID and permits any column update on a matching row. Email reuse, duplicate casing, or a stale profile can select or mutate the wrong UUID and attach membership to the wrong person.
- Recommended fix: resolve identities from verified `auth.users`/`auth.identities` through a privileged server path; synchronize trusted email changes; reconcile duplicates; add normalized case-insensitive uniqueness; use UUID ownership policies if direct profile access remains.
- Tests: email change and reuse, case-only duplicates, ambiguous matches, direct Data API attempts to update identity fields, and Google linking to a pre-created account.

### SEC-05 — High — Production secrets are available job-wide and materialized by builds

- Affected: `.github/workflows/deploy-production.yml`, `.github/actions/setup-node-pnpm/action.yml`, `scripts/release-preflight.ts`, and generated `dist/server/.dev.vars`.
- Scenario: production database, Supabase secret, Turnstile, and mail credentials are inherited by dependency installation, lifecycle scripts, lint, tests, build tooling, and third-party actions. A compromised dependency or action can exfiltrate them. The inspected build produced a plaintext `dist/server/.dev.vars` with six populated sensitive values and mode `0644`; it is ignored by Git and no secret was found in client JavaScript, but it expands exposure.
- Recommended fix: run install/lint/test without production secrets; expose only public `VITE_*` values to the build; validate remote secret names in an isolated deployment step; prevent or securely remove secret-bearing build artifacts before packaging.
- Tests: build with unique canaries and assert no canary or `.dev.vars` reaches client/deploy artifacts; assert setup/lint/test cannot read runtime secrets; verify deployed bindings separately.

### SEC-06 — Medium — Realtime membership revocation is delayed or absent

- Affected: `src/features/groups/server/groupSessionToken.ts`, `src/server.ts`, and `src/durable-objects/group-session-do.ts`.
- Scenario: membership is checked when a five-minute token is issued, not during WebSocket upgrade or every broadcast. Existing sockets stay connected after removal, and an unexpired token can reconnect.
- Recommended fix: recheck confirmed membership on upgrade, include revocation/version state, actively close removed users' sockets, and filter broadcasts by current authorization.
- Tests: remove a connected member and a token-holding disconnected member; both must receive no later event and reconnection must fail. Pending members must never connect.

### SEC-07 — Medium — Privileged account creation and invitation are not rate-limited or atomic

- Affected: `createGroup.ts`, `addGroupMembers.ts`, and `groupManagement.ts`.
- Scenario: an ordinary authenticated user can create groups and repeatedly proxy service-role Auth operations in batches. Remote Auth calls and database transactions can partially fail, leaving orphan users or pending memberships. Returned Supabase `{ error }` values may be ignored because only rejected promises are treated as failures.
- Recommended fix: durable actor/group/IP/recipient quotas; an idempotent invite ledger/outbox; explicit handling of returned errors; no remote Auth call inside a database transaction; reconciliation and audited compensation.
- Tests: repeated and concurrent batches hit shared limits; resolved `{ error }` values fail; database rollback leaves a reconcilable state; retry creates one Auth user and membership.

### SEC-08 — Medium — Application and Auth write paths lack durable application-level rate limits

- Affected: login, signup, password reset, group management, task writes, ratings, WebSocket connections, and pairing mutations.
- Scenario: Turnstile and provider limits do not provide durable per-actor limits across Worker instances. Valid-token automation or a compromised account can consume Auth, email, database, and Durable Object capacity. Task text, rating arrays, connection counts, and mutation queues also need explicit bounds.
- Recommended fix: verify live Supabase Auth and SMTP limits; add Cloudflare edge limits plus durable counters keyed by the appropriate IP, account, group, recipient hash, and action; cap payload bytes and per-socket mutation rates.
- Tests: threshold/window/concurrency tests across isolates, payload-boundary tests, 429 behavior, and generic recovery responses.

### SEC-09 — Medium — Supabase secret is reused as the Group Session signing secret

- Affected: `src/features/groups/server/groupSessionToken.ts`, `src/server.ts`, and Worker secret declarations.
- Scenario: the application signs WebSocket tokens with the same credential that bypasses Supabase RLS, coupling rotations and expanding the blast radius of a signing-oracle or logging defect.
- Recommended fix: introduce a dedicated `GROUP_SESSION_TOKEN_SECRET`, token audience/version, key IDs, and an overlap window for rotation.
- Tests: tokens signed with the service key, wrong key, expired key, group mismatch, and malformed input must fail; verify neither key enters browser artifacts or logs.

### SEC-10 — Medium — Security objects are not reproducible from tracked migrations

- Affected: `supabase/migrations/**` and the live catalog.
- Scenario: the repository tracks two narrow schema migrations but not grants, RLS policies, default privileges, functions, or views. Restores and new environments can silently diverge or recreate the current exposure.
- Recommended fix: after Phase 0A approval, capture the reviewed Phase 0B security baseline in migrations and add a read-only catalog drift check.
- Tests: bootstrap a clean database, compare its security catalog to the approved baseline, and run an anon/authenticated/member/admin negative-access matrix.

### SEC-11 — Medium — OAuth linking and recovery behavior depend on unrecorded settings

- Affected: Google OAuth/One Tap code, Auth callback, invite provisioning, password reset, and Supabase dashboard settings.
- Scenario: migrated or invited email identities may receive a different Google-auth UUID if linking settings or verified-email assumptions differ. Memberships would remain on the pre-created UUID. Separately, the reset page treats `recovery=1` plus any existing session as sufficient, rather than requiring a `PASSWORD_RECOVERY` event.
- Recommended fix: record and review provider/linking configuration, redirect allowlist, secure password-change settings, Auth rate limits, and SMTP. Reconcile `auth.identities` before migration. Require a recovery event or recent reauthentication for password creation.
- Tests: existing verified email, invited email-only account, collision/unverified provider, normal logged-in session on the reset route, expired/replayed recovery link, and sanitized redirect paths.

### SEC-12 — Medium — The keepalive workflow uses a full privileged key for a read-only table ping

- Affected: `.github/workflows/keep-supabase-alive.yml`.
- Scenario: compromise of a scheduled workflow exposes an RLS-bypassing key. The job also creates a dependency on Data API table access that the application otherwise does not need.
- Recommended fix: remove the job if no longer required, or replace it with provider-native project health/uptime controls or a purpose-built least-privilege endpoint.
- Tests: the replacement must work without a service key and must be unable to select application rows.

### SEC-13 — Low — Invitation failures can place recipient addresses in logs

- Affected: `createGroup.ts`, `groupManagement.ts`, and Cloudflare observability configuration.
- Scenario: provider errors containing recipient email addresses can be retained in sampled logs and become accessible to a broader operational audience.
- Recommended fix: log stable error codes and hashed/redacted recipients; review retention and access.
- Tests: captured logs contain no raw email, token, key, or connection string.

## Positive controls verified

- Server functions consistently derive the acting user with `supabase.auth.getUser()`; client-provided user IDs are target IDs and are scoped to the group. No current cross-group IDOR was found.
- Task deletion checks ownership. Pairing and pool management recheck confirmed membership and manager permission. Pending members are excluded from protected reads and mutations.
- Owner/admin/member rules protect owner continuity and prevent admins from granting privileged access.
- OAuth and confirmation redirects are sanitized to same-origin paths, and the password-reset request response does not enumerate accounts.
- The browser Supabase client reads only the public URL and publishable key. Source and built-client scans found no service key, database URL, credentialed Postgres URL, or server-only module.
- There are no application-table `.from()` or `.rpc()` calls in `src`; current Data API access to application tables is unnecessary.

## Phase 0B entry checklist

1. Create and verify both logical backups using the Phase 1 runbook; record provider snapshot identifiers separately.
2. Confirm the protected DTR group UUID and add an explicit deny/allow guard to every future migration write path.
3. Approve a least-privilege target state for Data API grants, default ACLs, and policies. Removing only policies is insufficient.
4. Replace the service-key keepalive dependency before revoking Data API table access.
5. Design and test the dedicated runtime database role before changing `DATABASE_URL`.
6. Add an authorization test matrix and a catalog snapshot/drift test before applying security DDL.
7. Resolve the Durable Object removed-member defect and socket revocation design before relying on group membership as an immediate revocation boundary.
8. Reconcile duplicate/stale profile emails and verify Google identity linking, recovery, Auth rate-limit, SMTP, and redirect dashboard settings.
9. Separate the Group Session token secret and reduce CI secret scope.

## References

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
