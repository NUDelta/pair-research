-- Phase 0B: create an empty, non-Data-API staging foundation for later phases.
-- This migration creates metadata structures only. It imports no legacy data.

set lock_timeout = '5s';
set statement_timeout = '60s';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'migration_private_owner') then
    create role migration_private_owner
      nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

alter role migration_private_owner
  nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
revoke migration_private_owner from pair_research_runtime, pair_research_runtime_login;
grant migration_private_owner to postgres;

create schema migration_private authorization migration_private_owner;
revoke all on schema migration_private
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;

set role migration_private_owner;

alter default privileges in schema migration_private revoke all on tables
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;
alter default privileges in schema migration_private revoke all on sequences
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;
alter default privileges in schema migration_private revoke all on functions
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;

create type migration_private.record_status as enum (
  'pending', 'imported', 'excluded', 'quarantined'
);

create table migration_private.batch (
  id uuid primary key default gen_random_uuid(),
  source_label text not null,
  mongodb_backup_sha256 text not null check (mongodb_backup_sha256 ~ '^[0-9a-f]{64}$'),
  supabase_backup_sha256 text not null check (supabase_backup_sha256 ~ '^[0-9a-f]{64}$'),
  source_extracted_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by text not null,
  notes text,
  check (completed_at is null or started_at is not null),
  check (completed_at is null or completed_at >= started_at)
);

create table migration_private.protected_target_group (
  group_id uuid primary key,
  label text not null,
  baseline_sha256 text not null check (baseline_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default now()
);

create table migration_private.record_ledger (
  batch_id uuid not null references migration_private.batch(id) on delete restrict,
  source_collection text not null,
  legacy_id text not null,
  status migration_private.record_status not null default 'pending',
  reason_code text,
  detail text,
  source_record_sha256 text not null check (source_record_sha256 ~ '^[0-9a-f]{64}$'),
  processed_at timestamptz,
  primary key (batch_id, source_collection, legacy_id),
  check (status = 'pending' or processed_at is not null),
  check (status not in ('excluded', 'quarantined') or reason_code is not null)
);

create table migration_private.id_crosswalk (
  batch_id uuid not null references migration_private.batch(id) on delete restrict,
  source_collection text not null,
  legacy_id text not null,
  target_table text not null,
  target_uuid uuid,
  target_bigint bigint,
  created_at timestamptz not null default now(),
  primary key (batch_id, source_collection, legacy_id, target_table),
  check (num_nonnulls(target_uuid, target_bigint) = 1)
);

create unique index id_crosswalk_target_uuid_unique
  on migration_private.id_crosswalk (batch_id, target_table, target_uuid)
  where target_uuid is not null;
create unique index id_crosswalk_target_bigint_unique
  on migration_private.id_crosswalk (batch_id, target_table, target_bigint)
  where target_bigint is not null;

create table migration_private.extraction_summary (
  batch_id uuid not null references migration_private.batch(id) on delete restrict,
  source_collection text not null,
  extracted_count bigint not null check (extracted_count >= 0),
  eligible_count bigint check (eligible_count >= 0),
  excluded_count bigint check (excluded_count >= 0),
  quarantined_count bigint check (quarantined_count >= 0),
  canonical_sha256 text not null check (canonical_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (batch_id, source_collection),
  check (
    coalesce(eligible_count, 0) + coalesce(excluded_count, 0)
      + coalesce(quarantined_count, 0) <= extracted_count
  )
);

create table migration_private.legacy_group_archive (
  batch_id uuid not null references migration_private.batch(id) on delete restrict,
  legacy_group_id text not null,
  legacy_creator_id text,
  name text not null,
  description text,
  legacy_member_count integer not null check (legacy_member_count >= 0),
  created_at timestamptz,
  sanitized_record_sha256 text not null check (sanitized_record_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (batch_id, legacy_group_id)
);

create table migration_private.legacy_membership_archive (
  batch_id uuid not null,
  legacy_group_id text not null,
  legacy_user_id text not null,
  legacy_role text,
  was_pending boolean not null default false,
  sanitized_record_sha256 text not null check (sanitized_record_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (batch_id, legacy_group_id, legacy_user_id),
  foreign key (batch_id, legacy_group_id)
    references migration_private.legacy_group_archive(batch_id, legacy_group_id)
    on delete restrict
);

alter table migration_private.batch enable row level security;
alter table migration_private.protected_target_group enable row level security;
alter table migration_private.record_ledger enable row level security;
alter table migration_private.id_crosswalk enable row level security;
alter table migration_private.extraction_summary enable row level security;
alter table migration_private.legacy_group_archive enable row level security;
alter table migration_private.legacy_membership_archive enable row level security;

revoke all on all tables in schema migration_private
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;
revoke all on all sequences in schema migration_private
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;
revoke all on all functions in schema migration_private
  from public, anon, authenticated, service_role, pair_research_runtime, pair_research_runtime_login;

comment on schema migration_private is
  'Private MongoDB migration ledger and sanitized archive; never expose through the Data API.';
comment on table migration_private.legacy_membership_archive is
  'Never store password hashes, login tokens, OAuth secrets, raw Meteor services data, or legacy task/rating history.';

reset role;
