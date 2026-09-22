# Phase 1 Backup and Restore Runbook

This runbook defines logical backups for the MongoDB Atlas legacy source and the current Supabase/PostgreSQL state. It does not start the migration and does not modify either source database.

Provider-native Atlas snapshots and Supabase backups/PITR are an additional recovery layer. Record their identifiers and retention windows in the change ticket, but do not treat them as replacements for independently checksummed logical exports.

## Safety rules

- Run exports from a trusted workstation with full-disk encryption.
- Choose an absolute `BACKUP_ROOT` outside the Git repository. The scripts reject a repository-local destination.
- Use a restricted directory or encrypted external volume. Scripts create directories as `0700` and artifacts/manifests as `0600`.
- Load credentials into the shell from a password manager or existing secure local configuration. Do not paste them into scripts, shell history, manifests, tickets, or commits.
- Stop application writes to the legacy MongoDB database for the database-scoped `mongodump`. A live database-scoped dump is not a cross-collection point-in-time snapshot. Keep writes stopped until the dump completes, then verify relationship invariants during restore rehearsal.
- Use dedicated read-only backup credentials where the provider supports them. PostgreSQL backup credentials must be able to read `public`, `auth`, and `supabase_migrations` and inspect their schema objects.
- Never restore first into production. Restore into an isolated, empty validation target.
- Do not use `--drop`, `--clean`, or a schema reset unless a separate destructive change has been approved.

## Required tools

Validated on the audit workstation:

- MongoDB Database Tools `mongodump`/`mongorestore` 100.16.1
- PostgreSQL `pg_dump`/`pg_restore` 17.11
- `shasum`, `bash`, and `git`

The `pg_dump` major version must be equal to or newer than the Supabase server major version. Prefer the same major version for restore testing.

## MongoDB Atlas logical backup

Set the values without committing or echoing them:

```bash
export BACKUP_ROOT='/absolute/encrypted/path/pair-research-backups'
export MONGODB_URI='mongodb+srv://...'
export MONGODB_DATABASE='pair-research'
export MONGODB_SOURCE_LABEL='Atlas production cluster / pair-research'
export MONGODB_WRITES_QUIESCED='yes'
```

Run:

```bash
./scripts/migration/backup-mongodb.sh
```

The script writes the URI to a short-lived `0600` MongoDB tools config file so that credentials do not appear in process arguments. It deletes the config after the command. The script creates one timestamped directory containing:

- a gzip-compressed `mongodump` archive;
- a SHA-256 checksum file; and
- a human-readable manifest with UTC timestamp, non-secret source label, database, tool version, redacted command, filename, and checksum.

The dump preserves collection documents, collection options, and indexes for the selected database. Atlas cluster users, project configuration, network access lists, triggers, and provider settings are not part of a database-level `mongodump`; record those settings separately if needed.

If an approved write-quiescence window is impossible, do not use the database-scoped script as a consistency boundary. Use an Atlas provider snapshot or an approved replica-set/oplog-consistent procedure, restore it into an isolated target, and create the logical export from that frozen restore.

Verify immediately and again after copying the backup:

```bash
./scripts/migration/verify-backup.sh \
  '/absolute/encrypted/path/pair-research-backups/mongodb-<timestamp>/backup-manifest.txt'
```

## Supabase/PostgreSQL logical backup

Use a direct or session-pooler Postgres connection supported by `pg_dump`, not a transaction-pooler endpoint. Prefer an existing protected libpq service file and passfile so credentials do not appear in arguments:

```bash
export BACKUP_ROOT='/absolute/encrypted/path/pair-research-backups'
export SUPABASE_SOURCE_LABEL='Supabase project twnurskjzrelsaptkblt / production'
export PGSERVICEFILE='/absolute/secure/path/pg_service.conf'
export PGPASSFILE='/absolute/secure/path/pgpass'
export PGSERVICE='pair_research_backup'
chmod 600 "$PGSERVICEFILE" "$PGPASSFILE"
```

Alternatively, load the URI into the environment. The script maps it to libpq's `PGDATABASE` and does not put it in `pg_dump` arguments:

```bash
export SUPABASE_DATABASE_URL='postgresql://...'
```

Prefer `PGSERVICE` plus `PGPASSFILE` for production so credentials are managed by established protected libpq configuration. When `SUPABASE_DATABASE_URL` is used, the backup script moves it into a temporary mode-`0600` libpq service file, unsets the source variable before starting PostgreSQL tools, and deletes the file on exit; the URL is never placed in a client process argument.

Run:

```bash
./scripts/migration/backup-supabase.sh
```

The custom-format archive includes schema and data for:

- `public`: application data, constraints, indexes, policies, grants, and schema objects;
- `auth`: users, identities, sessions, and other Auth state needed to validate recovery; and
- `supabase_migrations`: provider migration state.

`pg_dump` includes object ACLs by default; the script intentionally does not pass `--no-privileges`. Cluster-global roles and provider control-plane settings are not included. Supabase-managed roles must already exist in the restore target, and restoring the `auth` schema into a hosted project may require provider-specific support and careful version matching.

Verify:

```bash
./scripts/migration/verify-backup.sh \
  '/absolute/encrypted/path/pair-research-backups/supabase-<timestamp>/backup-manifest.txt'
```

If the backup role can inspect global roles, separately capture a reviewed `pg_dumpall --roles-only` output into the secure backup directory. It may include password verifiers and provider-managed roles, so encrypt it, checksum it, restrict it to `0600`, and do not assume it can be restored to hosted Supabase. The normal script does not create this sensitive optional artifact.

## Control-plane and catalog evidence

The logical dumps do not capture all database-global or provider control-plane state. Before Phase 0B, record the following in the restricted change record or in separately checksummed artifacts under `BACKUP_ROOT`:

- PostgreSQL role attributes and memberships for the runtime, migration, `anon`, `authenticated`, and `service_role` roles;
- database/role settings and the Data API exposed-schema list;
- required extensions and versions;
- Supabase Auth providers, automatic/manual linking settings, redirect allowlist, secure password-change setting, rate limits, SMTP/send-email hook, and JWT/session lifetime;
- Supabase project/branch identity and backup/PITR retention;
- Atlas cluster/project identity, topology, database users/roles, network rules, triggers, and snapshot retention.

Do not record API keys, database passwords, OAuth client secrets, JWT signing secrets, session tokens, or password verifiers in this evidence.

## Provider-native backup layer

Before Phase 0B, a project owner should record:

- the latest successful MongoDB Atlas Cloud Backup snapshot ID, timestamp, cluster, retention, and restore-test status;
- the latest Supabase daily backup or PITR recovery point, retention, project/branch, and restore-test status; and
- the ticket/change record linking these snapshots to the logical backup manifests.

Provider-native backups can capture provider-specific state and offer faster recovery, but their retention, account access, and same-provider dependency differ from local logical exports.

## MongoDB restore rehearsal

Create an empty, isolated MongoDB target with no production network path. Place the target URI in a protected MongoDB tools config file rather than an argument:

```yaml
# /absolute/secure/path/mongorestore.yml (mode 0600)
uri: 'mongodb://isolated-validation-target/...'
```

```bash
chmod 600 '/absolute/secure/path/mongorestore.yml'
```

Then run:

```bash
mongorestore \
  --config='/absolute/secure/path/mongorestore.yml' \
  --archive='/absolute/path/to/<artifact>.mongodump.archive.gz' \
  --gzip \
  --dryRun \
  --verbose
```

After the target and namespace have been independently verified, restore without `--drop`:

```bash
mongorestore \
  --config='/absolute/secure/path/mongorestore.yml' \
  --archive='/absolute/path/to/<artifact>.mongodump.archive.gz' \
  --gzip \
  --stopOnError
```

Validate collection counts, indexes, collection options, and representative relationships. Do not use `--drop` against a non-empty target.

## PostgreSQL restore rehearsal

Inspect the archive before connecting to a target:

```bash
pg_restore --list '/absolute/path/to/<artifact>.pgdump'
```

Create an empty, non-production PostgreSQL target with compatible Supabase extensions and roles. Generate reviewable SQL if desired:

```bash
pg_restore \
  --file='/secure/path/restore-preview.sql' \
  --no-owner \
  '/absolute/path/to/<artifact>.pgdump'
```

The preview contains sensitive data and must stay in the secure backup location with mode `0600` and its own checksum.

After target verification, restore only into the disposable isolated target. A newly created PostgreSQL database already contains `public`, so use archive-scoped cleanup to replace the archived schemas; never point this command at production or a shared database:

```bash
export PGSERVICEFILE='/absolute/secure/path/pg_service.conf'
export PGPASSFILE='/absolute/secure/path/pgpass'
export PGSERVICE='pair_research_restore_validation'
chmod 600 "$PGSERVICEFILE" "$PGPASSFILE"
pg_restore \
  --dbname="service=$PGSERVICE" \
  --clean \
  --if-exists \
  --exit-on-error \
  --no-owner \
  '/absolute/path/to/<artifact>.pgdump'
```

If exact ownership is required, create and map the expected roles in the isolated target instead of using `--no-owner`. Review any errors involving Supabase-managed `auth` objects with the current Supabase backup/restore documentation before proceeding.

## Restore acceptance checks

For both systems:

1. Re-run SHA-256 verification after every copy or transfer.
2. Record tool versions, target versions, start/end timestamps, and all warnings.
3. Compare per-collection/per-table counts with the backup-time extraction ledger.
4. Verify indexes, foreign keys, unique constraints, policies, grants, default ACLs, sequences, and migration history.
5. Confirm no credential values appear in manifests or logs.
6. Destroy or retain the isolated restore target according to the approved data-handling policy.

For Supabase specifically, test as `anon`, `authenticated`, the intended runtime role, and the migration/admin role. A successful owner-level query is not evidence that RLS or grants were restored correctly.

An interrupted script leaves a `.partial` file and a `BACKUP_FAILED` marker. Such a directory is not a backup and must not be copied, restored, or entered into the migration ledger. Only a directory with a completed manifest and passing verifier is usable.

## References

- [MongoDB `mongodump`](https://www.mongodb.com/docs/database-tools/mongodump/)
- [MongoDB `mongorestore`](https://www.mongodb.com/docs/database-tools/mongorestore/)
- [MongoDB Atlas Cloud Backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)
