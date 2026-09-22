# Phase 0B Security Deployment Runbook

This runbook deploys the Phase 0B hardening without importing MongoDB data or changing Pair Research application rows. The DTR group is protected production data. Never reset its pairing, delete its tasks, or use it as a migration fixture.

## Current implementation boundary

The repository contains the security changes, but they are not proof that production is protected. At the time this runbook was written, no verified logical backup, restore rehearsal, DTR baseline, production DDL, Worker deployment, Dashboard change, email, or credential rotation had been performed from the development environment.

The tracked migration history is not a clean database bootstrap: the original application tables predate the repository migrations. Apply and test Phase 0B only on a verified Supabase logical restore containing the canonical application schema. Before Phase 2, capture/review a complete baseline schema migration or formally retain the verified restore as the bootstrap prerequisite; string-level migration tests are not a substitute for executing the SQL.

The executable migrations are intentionally ordered:

1. `20260921181000_phase_0b_runtime_role.sql` provisions the runtime roles, exact DML grants, and runtime-only RLS policies.
2. `20260921181100_phase_0b_invitation_rate_limits.sql` adds the server-only invitation ledger required by the Phase 0B application build. It is applied before the Worker deploy and is already denied to browser/Data API roles.
3. `20260921181200_phase_0b_disable_data_api.sql` removes every non-runtime application-table policy and revokes Data API privileges.
4. `20260921181300_phase_0b_migration_private_foundation.sql` creates the empty private migration schema and owner.

Do not apply all pending migrations in one production step during the initial cutover. The runtime-role switch must be verified before migration 3 (`...disable_data_api.sql`) removes old access. Deploy from the focused runtime-role commit first, then deploy the later migrations only after the gate passes.

## Gate 0: recovery evidence

Complete every item before production DDL:

1. Create and verify the MongoDB and Supabase logical exports using [backup-and-restore-runbook.md](./backup-and-restore-runbook.md). Record MongoDB write quiescence and either PostgreSQL write quiescence through completion of the source acceptance summary or a reviewed coordinated snapshot shared by the dump and summary.
2. Restore both exports into isolated non-production targets and record count, index, constraint, policy, grant, and Auth checks.
3. Record Atlas snapshot and Supabase backup/PITR identifiers, timestamps, retention, and restore-test status.
4. Store manifests, artifacts, restore evidence, and checksums outside Git on encrypted storage.

Required commands, after loading credentials from protected configuration:

```bash
./scripts/migration/backup-mongodb.sh
./scripts/migration/backup-supabase.sh
./scripts/migration/verify-backup.sh '/secure/path/mongodb-<timestamp>/backup-manifest.txt'
./scripts/migration/verify-backup.sh '/secure/path/supabase-<timestamp>/backup-manifest.txt'
```

An absent manifest, a `.partial` file, or `BACKUP_FAILED` is not a recovery point.

Checksum verification is not the Gate 0 completion signal. Before continuing, create a protected, checksummed restore-evidence artifact for **each** database that records the disposable target identity/version, start/end timestamps, restore command with credentials redacted, warnings, source-versus-restored counts, and the acceptance checks from the backup runbook. The Mongo evidence must include the counts emitted at the dump consistency boundary. The PostgreSQL evidence must cover tables, constraints, indexes, policies, RLS, grants/default ACLs, Auth rows, and migration state. Record the Atlas and Supabase provider recovery-point identifiers and retention in the same protected change record. If either restore-evidence artifact or either provider recovery point is absent, **STOP before Stage 1**.

## Capture the DTR baseline

Use an admin/read-only database connection through protected libpq configuration. Do not put a password in command arguments.

```bash
export DTR_GROUP_ID='<verified-production-DTR-uuid>'
export DTR_BASELINE_ROOT='/absolute/encrypted/path/pair-research-change-evidence'
export DTR_EXPECTED_PROJECT_REF='twnurskjzrelsaptkblt'
export DTR_SOURCE_LABEL='Supabase project twnurskjzrelsaptkblt / production'
export PGSERVICE='pair_research_phase_0b_admin'
./scripts/migration/capture-dtr-baseline.sh
```

The command accepts only a direct host exactly matching `db.<project-ref>.supabase.co`, or a Supabase pooler host paired with a role username ending in `.<project-ref>`. The artifact records the sanitized matched connection form/target plus the group row, membership/role state, active pairing, pairs, and active tasks; volatile pooler server IPs are deliberately excluded. It is mode `0600` and checksummed. Before Stage 1, verify the `.sha256` file, review `source_identity`, and independently confirm that the resolved group is the real production DTR group. If the baseline command, checksum, identity review, or DTR resolution fails, **STOP before Stage 1**. Repeat the command after each rollout stage and compare the JSON after removing only `captured_at`. Both `source_identity` and all application rows must be identical.

## Stage 1: least-privilege runtime

1. Apply the runtime-role and invitation-ledger migrations (`...181000...runtime_role.sql` and `...181100...invitation_rate_limits.sql`) using the established linked Supabase migration workflow. The final application build queries the ledger, so both migrations must exist before deploying it. Do not apply the later Data API lockdown yet.
2. As the database administrator, set a generated password interactively. Do not place it in SQL, shell history, CI, or Git:

   ```text
   psql service=pair_research_phase_0b_admin
   \password pair_research_runtime_login
   ```

3. Build the pooler URL using the custom-role username format `pair_research_runtime_login.<project-ref>`. Keep the transaction-pooler option required by the Worker/Prisma deployment. Save it only as the Cloudflare Worker `DATABASE_URL` secret.
4. Deploy the Worker and exercise login, profile load/update, group list/detail, member/admin/owner settings, pending-member denial, cross-group denial, task/rating mutations, pairing in a non-DTR test group, and reset in that same test group.
5. Verify that the Worker is using `pair_research_runtime_login`, not `postgres`, and run the catalog checks that apply after stage 1.

   ```bash
   export PGSERVICE='pair_research_phase_0b_runtime'
   ./scripts/migration/verify-phase-0b-runtime.sh
   ```

6. On the isolated restored database only, exercise the granted DML and sequence surface with rollback-only fixtures:

   ```bash
   export PGSERVICE='pair_research_phase_0b_runtime_restore'
   export PHASE_0B_ISOLATED_DML_CONFIRM='YES'
   ./scripts/migration/verify-phase-0b-runtime-dml.sh
   ```

   Never point this command at production: its transaction rolls back rows, but PostgreSQL sequence increments are not transactional.

7. Capture another production DTR baseline with the same expected project ref and source label. Verify both SHA-256 files, remove only `captured_at` from the JSON comparison, and require an exact match with the pre-deployment artifact. Any source-identity or application-row difference means **STOP, restore the prior Worker `DATABASE_URL`, redeploy, and investigate before Stage 2**.

Rollback stage 1 by restoring the prior Worker `DATABASE_URL`, redeploying, and smoke testing. Do not delete or alter `postgres`. Drop runtime roles only after connections drain and only in a separately reviewed cleanup.

## Stage 2: close the Data API

Only after stage 1 passes:

1. Remove the obsolete keepalive workflow as deployed by this change.
2. Before applying the Data API lockdown, validate on a hosted non-production Supabase project with the same role model that the migration executor can alter `supabase_admin` default ACLs. If this exact rollback-only statement fails, stop and open a Supabase support request rather than omitting the reproducible default-ACL control:

   ```sql
   begin;
   alter default privileges for role supabase_admin in schema public
     revoke all on tables from public, anon, authenticated, service_role;
   rollback;
   ```

3. Apply the Data API lockdown migration and the remaining migration-private foundation migration.
4. Run the catalog verifier:

   ```bash
   export PGSERVICE='pair_research_phase_0b_admin'
   ./scripts/migration/verify-phase-0b-security.sh
   ```

   In Supabase **API Settings → Exposed schemas**, verify `migration_private` is absent. Record the setting as deployment evidence; PostgreSQL grants do not control this dashboard list.

5. Load short-lived access tokens for a test unrelated user, normal member, admin, and owner, then run:

   ```bash
   export SUPABASE_URL='https://twnurskjzrelsaptkblt.supabase.co'
   export SUPABASE_PUBLISHABLE_KEY='<publishable-key>'
   export SUPABASE_UNRELATED_ACCESS_TOKEN='<short-lived-token>'
   export SUPABASE_UNRELATED_USER_ID='<expected-user-uuid>'
   export SUPABASE_MEMBER_ACCESS_TOKEN='<short-lived-token>'
   export SUPABASE_MEMBER_USER_ID='<expected-user-uuid>'
   export SUPABASE_ADMIN_ACCESS_TOKEN='<short-lived-token>'
   export SUPABASE_ADMIN_USER_ID='<expected-user-uuid>'
   export SUPABASE_OWNER_ACCESS_TOKEN='<short-lived-token>'
   export SUPABASE_OWNER_USER_ID='<expected-user-uuid>'
   ./scripts/migration/verify-data-api-denied.sh
   ```

   Every application-table read must return HTTP 401 or 403. HTTP 200 with zero rows is a failure because it means the endpoint remains authorized.

6. Repeat the server-side application smoke matrix. Browser roles have no application-table CRUD by design; Supabase in the browser remains Auth-only.
7. Capture and compare the post-deployment DTR baseline. The baseline must contain the group, memberships, group roles, active pairing, pairs, affinities, all group tasks, and task-help capacities; a missing DTR group is a hard failure.

Do not roll back by recreating `SELECT USING (true)`. If an undiscovered dependency exists, first switch the Worker back to the previous known-good database credential. Restore only a narrowly reviewed object grant/policy from the pre-change catalog or backup.

## Group Session signing-secret rollout

`GROUP_SESSION_SIGNING_SECRET` must be independent from every Supabase key.

1. Generate at least 32 random bytes in an approved password manager.
2. Before deploying the code, add it as a secret to the existing `pair-research` Worker with the Cloudflare Dashboard or interactive `pnpm wrangler secret put GROUP_SESSION_SIGNING_SECRET`.
3. Verify name-only presence with `pnpm wrangler secret list`; never print the value.
4. Deploy the code. Tokens created before the deployment expire within five minutes and will not verify under the new key; clients fetch a new token automatically. Existing connections are separately revoked by live membership checks and member-removal reconciliation.

## Supabase Auth Dashboard checklist

These settings are control-plane state and cannot be made reproducible by PostgreSQL migrations. Record screenshots/exports and reviewer approval in the change record.

- **URL Configuration:** Site URL is `https://pairresearch.io`. Allow exact production paths for `/auth/callback`, `/auth/confirm`, and `/reset-password`. Avoid broad production wildcards. Add `www` only if it is intentionally supported; keep localhost/preview origins out of production.
- **Google provider:** the Google redirect URI targets `https://twnurskjzrelsaptkblt.supabase.co/auth/v1/callback`. Before any legacy-user migration, canary-test password user + Google, invited/unconfirmed user + Google, One Tap, and collision/unverified identity cases. Confirm the UUID remains the membership UUID.
- **Email templates:** verify invite, confirmation, and recovery templates preserve `token_hash`, `type`, the sanitized `next` path, and the repository callback routes without duplicating callback paths.
- **SMTP:** configure and test custom SMTP or an approved Send Email Hook, including SPF, DKIM, and DMARC. The built-in sender is not production-capable. Record the project email quota after SMTP is enabled.
- **Password controls:** minimum length at least 8, secure password change/recent-login protection enabled, and leaked-password protection enabled if the plan supports it.
- **Rate limits:** record the actual project values. Keep at least the provider defaults for signup/sign-in and verification (30 requests per 5 minutes per IP), token refresh (150 per 5 minutes per IP), and per-user signup/recovery cooldown (60 seconds), unless production traffic evidence supports stricter settings. Application invitations additionally enforce persistent limits of 20 recipients per actor per 15 minutes, 50 per group per day, and 3 per recipient per day; group creation is limited to 10 per actor per day. Each group Durable Object persists per-user one-minute limits (60 task writes, 60 rating writes, 10 pairing attempts, 10 pool resets, and 120 snapshots) and permits at most three concurrent sockets per user. Retain the hashed invitation reconciliation ledger for at least 30 days. Run `scripts/migration/cleanup-invitation-ledger.sh` as an approved bounded maintenance job; it deletes only completed operations and deliberately retains reserved, provisioned, and failed reconciliation rows.
- **Identity linking:** do not assume automatic linking behavior. Complete the UUID canaries above and reconcile collisions before Phase 2.

The browser Auth client records an observed `PASSWORD_RECOVERY` event in session storage and binds it to both the authenticated UUID and JWT `session_id`. The reset page consumes only that same recovery session; a query parameter, ordinary login, same-user replacement session, sign-out, or account replacement cannot retain password-change authority.

## CI, artifacts, and secrets

GitHub Actions receives only public `VITE_*` build configuration and Cloudflare deployment credentials. Worker runtime secrets stay in Cloudflare. `pnpm build` removes runtime/deployment credentials inherited from the caller before starting Vite, disables loading `.env` into Cloudflare preview output, and fails if environment files, package-manager/netrc credentials, private keys, conventional secrets files, or configured secret canaries appear in deploy artifacts.

After this deployment succeeds, rotate these previously overexposed credentials one at a time with a tested rollback:

- the PostgreSQL password in the former production `DATABASE_URL`;
- `SUPABASE_SECRET_KEY`;
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`;
- `RESEND_API_KEY`.

Do not rotate public `VITE_*` values merely because they were present in the build. The Cloudflare API token was already scoped to the deployment action and is not included in this rotation list by this finding alone.

## Exit criteria

Phase 0B is complete only when backup restore rehearsals pass, both DTR comparisons pass, the Worker uses the runtime login, catalog and Data API verification pass, application authorization smoke tests pass, Auth Dashboard settings are recorded, the independent signing secret is deployed, and the listed secrets have an approved rotation status. Until then, Phase 2 is blocked.
