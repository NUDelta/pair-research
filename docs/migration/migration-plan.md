# MongoDB Atlas to Supabase Migration Plan

This plan is based on read-only inspection of the connected legacy MongoDB Atlas database, the current Supabase schema/catalog, and the application authorization/data paths. Phase 0A and the Phase 1 preparation artifacts are complete in this change; no backup export, staging DDL, security DDL, or data migration has been executed.

## Non-negotiable invariants

- The existing real DTR Supabase group is never modified.
- Existing Supabase test groups are not deleted by this migration.
- Every newly migrated legacy group starts with `active_pairing_id = NULL` and no live tasks, help capacities, affinities, pairings, pairs, or Durable Object pool state.
- Legacy passwords and all credential/token material are excluded.
- Legacy tasks, ratings, affinities, pairing rounds, pairs, and history do not enter the live pairing pool.
- Every imported, excluded, and quarantined source record has a batch, source ID, reason/status, and checksum.
- Every write phase is idempotent, dry-run first, and stops on an unexpected existing target ID.

## Source-to-target disposition

| MongoDB source                        | Supabase disposition                                                | Rule                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                               | `auth.users`/`auth.identities` reconciliation plus `public.profile` | Never migrate password hashes, sessions, OAuth tokens, or raw `services`. Link only verified identities; otherwise use recovery.      |
| `groups`                              | new `public.group` rows                                             | Allocate new UUIDs, protect the DTR UUID, set `active_pairing_id` to `NULL`.                                                          |
| embedded/related group memberships    | `public.group_member` and `public.group_role`                       | Map only resolved users; quarantine ambiguous identities and invalid roles; preserve owner/admin/member intent only after validation. |
| `tasks` and `tasks_history`           | no live import                                                      | Exclude from live tables; retain only approved sanitized counts/checksums or offline archive summaries.                               |
| `affinities` and `affinities_history` | no live import                                                      | Exclude from live tables and pairing inputs.                                                                                          |
| `pairings` and `pairs_history`        | no live import                                                      | Exclude from live pairing state; optional sanitized aggregate archive only after retention review.                                    |
| Meteor/provider auxiliary collections | excluded                                                            | Do not migrate system, configuration, credential, or provider-maintained records.                                                     |

Exact legacy field mapping must be generated from a checksummed backup in the extraction phase. It must not be inferred from a small Compass sample.

## Phase 0A — Security audit (this change)

1. Capture live grants, policies, RLS state, default ACLs, roles, functions, and views.
2. Audit browser/server secret boundaries and generated artifacts.
3. Review every server mutation, ID boundary, owner/admin/member/pending rule, Auth flow, and Durable Object boundary.
4. Record findings and the required negative tests without changing production security state.

Exit gate: the audit report is reviewed, severity/owners are assigned, and the Phase 0B target security model is approved.

## Phase 1 — Backup and staging preparation (this change)

1. Record Atlas and Supabase provider-native recovery points.
2. Run the logical-backup scripts manually with production credentials into encrypted storage outside Git.
3. Verify SHA-256 checksums and rehearse both restores into isolated targets.
4. Complete the Phase 0B least-privilege runtime-role change, create the separate no-login staging owner, then review and convert the private staging design into a proper migration.
5. Prove `migration_private` is absent from Data API exposed schemas and inaccessible to `PUBLIC`, `anon`, `authenticated`, and `service_role`.

Exit gate: both manifests and restore reports are approved; the DTR UUID is recorded in protected migration configuration; staging security tests pass.

## Phase 0B — Security remediation before migration writes

1. Replace the Data API keepalive dependency.
2. Commit the reviewed grant/RLS/default-ACL baseline and negative-access tests.
3. Remove unconditional application-table reads and unnecessary client-role grants.
4. Replace the `postgres` runtime connection with a least-privilege application role.
5. Fix Durable Object member eviction/socket revocation and revalidate membership at pairing commit.
6. Separate the Group Session signing secret and reduce CI secret scope.
7. Fix invitation identity resolution, Auth error handling, and durable rate limits.
8. Verify Google automatic-link behavior, recovery, redirects, Auth limits, and SMTP in the dashboard with canary accounts.

Exit gate: catalog, authorization, IDOR, realtime revocation, secret-scan, and Auth canary tests pass in a non-production environment; production rollout has a rollback plan.

## Phase 2 — Deterministic extraction and classification

1. Extract only from the frozen MongoDB archive, not the changing live database.
2. Canonicalize each allowed record and compute per-record and per-collection SHA-256 checksums.
3. Classify every record as eligible, excluded, or quarantined with stable reason codes.
4. Profile duplicate/invalid emails, missing users, missing groups, broken memberships, role anomalies, and history-only references.
5. Produce a review report with counts that reconcile exactly to the source extraction totals.

Exit gate: no unclassified record, no checksum/count mismatch, and all identity ambiguities are quarantined.

## Phase 3 — Identity and crosswalk rehearsal

1. Reconcile verified Supabase Auth identities without importing passwords.
2. Test Google linking and recovery for representative existing, invited, and legacy-only identities.
3. Allocate prospective target UUID/bigint values in the crosswalk; never point a legacy group to an existing group.
4. Dry-run foreign keys, uniqueness, role invariants, and the DTR deny guard.

Exit gate: every importable membership resolves to exactly one approved Auth UUID, and every target ID is collision-free.

## Phase 4 — Controlled live import (future approval required)

1. Establish a maintenance/change window and fresh backup/recovery point.
2. Import one small canary batch of profiles/groups/roles/memberships only.
3. Verify permissions and explicitly assert empty live pairing state.
4. Import remaining approved batches idempotently, stopping on any count, checksum, authorization, or collision mismatch.
5. Never update/delete existing group rows; insert only newly allocated group IDs.

Rollback is batch-based: stop writes, identify rows through the batch/crosswalk ledger, and execute a separately reviewed compensating migration. Do not use an unscoped delete or schema reset.

## Phase 5 — Validation and cutover

1. Reconcile source eligible counts, target inserts, exclusions, and quarantines.
2. Verify every new group has a confirmed owner and intended roles/memberships.
3. Test member/admin/owner/pending behavior, invitations, Google login, and recovery.
4. Assert the DTR group and all pre-existing test groups are byte-for-byte unchanged for in-scope columns.
5. Monitor Auth, invitation, database, and Durable Object errors before declaring completion.

Keep the Atlas database and logical backups read-only for the approved rollback/retention period. Decommissioning is a separate destructive task and is not authorized by this plan.
