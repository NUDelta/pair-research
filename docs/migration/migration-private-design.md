# Private Migration Staging Design

Status: design only. `supabase/staging/migration_private.sql` is intentionally outside `supabase/migrations` and has not been applied or populated.

## Atlas source inventory observed

The connected `pair-research` database contains the legacy core collections `users`, `groups`, `tasks`, `tasks_history`, `pairings`, `pairs_history`, `affinities`, and `affinities_history`, plus Meteor/provider auxiliary collections. Read-only inspection also confirmed legacy user records with bcrypt material. Password hashes, login tokens, OAuth credentials, raw Meteor `services`, and provider/system collections are explicitly excluded from migration staging and from the target Auth import.

Legacy passwords will not be migrated. A legacy person must either link to the same verified identity through Google or complete Supabase password recovery to establish a new password.

## Schema goals

The proposed `migration_private` schema supports:

- a batch ledger tied to immutable MongoDB and Supabase logical-backup SHA-256 values;
- a protected-target registry for the DTR group UUID and its baseline fingerprint;
- a per-record imported/excluded/quarantined ledger with reason codes;
- Mongo legacy ID to Supabase UUID or bigint crosswalks;
- extraction counts and deterministic canonical checksums; and
- typed, sanitized group and membership archive tables.

It intentionally does not define live-data import functions, triggers, views, or `SECURITY DEFINER` code.

## Access boundary

- The schema must not be listed in Supabase Data API exposed schemas.
- A dedicated `migration_private_owner` `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS` role must be created by an administrator first. It must not be granted to the application runtime role.
- The design makes that role the schema/object owner and revokes schema, table, sequence, function, and default privileges from `PUBLIC`, `anon`, `authenticated`, `service_role`, and `postgres`.
- RLS is enabled as defense in depth and no policies are defined. Only a separately approved migration operator that can deliberately `SET ROLE migration_private_owner` may access the tables.
- The future migration role must be separate from the application runtime role and must not be available to browser or normal Worker paths.
- Do not apply the staging design while the application still connects as the privileged `postgres` role. Phase 0B must first move the runtime to a least-privilege role with no membership/admin option on `migration_private_owner`.
- Before application, audit the executing owner, role memberships, and default-privilege owner. `ALTER DEFAULT PRIVILEGES` applies to objects later created by that owner, not globally.

## Data-handling rules

Allowed staging content is limited to values required to reproduce migration decisions: legacy identifiers, target identifiers, batch metadata, status/reason codes, normalized structural data, counts, and checksums.

Never stage:

- bcrypt or other password verifiers;
- password-reset, login, session, or OAuth tokens;
- raw Meteor `services` objects;
- OAuth client secrets or provider refresh tokens;
- unneeded legacy task text, ratings, affinities, pairings, or history payloads; or
- MongoDB provider/system collection contents.

If later reconciliation requires an email, store only the minimum verified/normalized value in a separate, explicitly reviewed identity-staging table with a retention deadline. Do not add it casually to the general archive.

## Protected current Supabase data

The existing real DTR group is out of migration scope and must not be modified. Before Phase 2:

1. record its exact UUID in a separately approved, non-secret migration configuration;
2. make every migration write assert that the target group ID is newly allocated and is not the protected UUID;
3. reject any legacy-to-target crosswalk that references an existing group;
4. perform dry-run collision reporting before enabling writes; and
5. leave all other existing Supabase test groups untouched unless a later task explicitly authorizes cleanup.

## Future live-record rules

When a later phase is approved, every newly migrated legacy group must start with:

- `active_pairing_id = NULL`;
- no live `task` rows;
- no live `task_help_capacity` rows;
- no live `affinity` rows;
- no active or historical `pairing`/`pair` rows imported into the live pool; and
- no Durable Object task/rating state.

Legacy tasks, ratings/affinities, rounds, pairs, and history may contribute only to sanitized offline validation or archival summaries after an explicit retention review. They must never seed the live pairing pool.

## Proposed later workflow (not implemented)

1. Freeze a verified logical-backup pair and create a batch linked to both checksums.
2. Extract deterministic canonical records from MongoDB without credentials or excluded payloads.
3. Record extraction counts and per-record hashes.
4. Resolve Auth identities by verified identity, never by an untrusted email match alone.
5. Quarantine ambiguous, duplicate, orphaned, or structurally invalid records.
6. Allocate new target IDs and write crosswalks without touching existing groups.
7. Dry-run constraints and DTR protection checks.
8. Import only approved profiles/groups/memberships in a reversible batch.
9. Validate counts, relationships, permissions, and empty live pairing state.
10. Retain or destroy private staging data according to an approved retention plan.

## Pre-application review for the staging SQL

- Confirm the schema is absent from Data API exposed schemas.
- Create and verify the dedicated no-login owner; confirm the least-privilege runtime cannot `SET ROLE` to it.
- Verify `PUBLIC`, `anon`, `authenticated`, `service_role`, `postgres`, and the application runtime have no effective privileges, including through role membership.
- Add tests using `has_schema_privilege`, `has_table_privilege`, and direct negative queries.
- Confirm backups and restore rehearsal have passed before applying any staging DDL.
- Apply through a reviewed migration only after Phase 0B/Phase 1 approval; do not paste the design file directly into production.
