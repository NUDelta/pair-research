-- Phase 0B, rollout stage 2: disable Data API access to application tables.
-- Apply only after the Worker has been verified on pair_research_runtime_login.

set lock_timeout = '5s';
set statement_timeout = '60s';

do $$
declare
  application_table text;
  existing_policy record;
begin
  foreach application_table in array array[
    'affinity',
    'group',
    'group_member',
    'group_role',
    'pair',
    'pairing',
    'profile',
    'task',
    'task_help_capacity'
  ]
  loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = application_table
        and policyname not like 'pair_research_runtime_%'
    loop
      execute format('drop policy %I on public.%I', existing_policy.policyname, application_table);
    end loop;

    execute format('alter table public.%I enable row level security', application_table);
    execute format(
      'revoke all privileges on table public.%I from public, anon, authenticated, service_role',
      application_table
    );
  end loop;
end
$$;

revoke all privileges on sequence
  public.affinity_id_seq,
  public.group_member_id_seq,
  public.group_role_id_seq,
  public.pair_id_seq,
  public.task_id_seq,
  public.task_help_capacity_id_seq
from public, anon, authenticated, service_role;

revoke execute on all functions in schema public from public, anon, authenticated, service_role;
revoke all on schema public from public, anon, authenticated, service_role;

-- Application migrations are executed by postgres. Future application objects
-- must not silently regain Data API privileges through Supabase defaults.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

-- Phase 0A found the same broad defaults under supabase_admin. This migration
-- must fail atomically if the deployment administrator cannot normalize them;
-- do not continue with a partially reproducible security baseline.
alter default privileges for role supabase_admin in schema public
  revoke all privileges on tables from public, anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public
  revoke all privileges on sequences from public, anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

grant usage on schema public to pair_research_runtime;

comment on schema public is
  'Application tables are server-only through Prisma; browser Data API roles have no object privileges.';
