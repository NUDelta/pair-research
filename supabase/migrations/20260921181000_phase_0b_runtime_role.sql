-- Phase 0B, rollout stage 1: provision a least-privilege Prisma runtime role.
--
-- Production deployment is intentionally two-stage. Apply this migration,
-- configure a password for pair_research_runtime_login out of band, switch the
-- Worker DATABASE_URL, and verify the application before applying the later
-- Data API lockdown migration.

set lock_timeout = '5s';
set statement_timeout = '60s';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'pair_research_runtime')
    or exists (select 1 from pg_roles where rolname = 'pair_research_runtime_login')
  then
    raise exception 'Phase 0B runtime roles already exist; inspect memberships and privileges before retrying';
  end if;

  create role pair_research_runtime
    nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  create role pair_research_runtime_login
    login inherit nosuperuser nocreatedb nocreaterole nobypassrls;
end
$$;

do $$
begin
  execute format(
    'revoke all privileges on database %I from pair_research_runtime, pair_research_runtime_login',
    current_database()
  );
  execute format('grant connect on database %I to pair_research_runtime', current_database());
end
$$;

revoke create on schema public from public;
revoke all on schema public from pair_research_runtime, pair_research_runtime_login;
grant usage on schema public to pair_research_runtime;
revoke create on schema public from pair_research_runtime, pair_research_runtime_login;

revoke all privileges on all tables in schema public from pair_research_runtime, pair_research_runtime_login;
revoke all privileges on all sequences in schema public from pair_research_runtime, pair_research_runtime_login;
revoke execute on all functions in schema public from public, pair_research_runtime, pair_research_runtime_login;
alter default privileges for role postgres in schema public revoke execute on functions from public;

grant select, insert, update on table public.profile to pair_research_runtime;
grant select, insert, update on table public."group" to pair_research_runtime;
grant select, insert, update, delete on table public.group_member to pair_research_runtime;
grant select, insert, update, delete on table public.group_role to pair_research_runtime;
grant select, insert on table public.pairing to pair_research_runtime;
grant select, insert on table public.pair to pair_research_runtime;
grant select, insert, update, delete on table public.task to pair_research_runtime;
grant select, insert, delete on table public.task_help_capacity to pair_research_runtime;
grant insert on table public.affinity to pair_research_runtime;

grant usage on sequence
  public.affinity_id_seq,
  public.group_member_id_seq,
  public.group_role_id_seq,
  public.pair_id_seq,
  public.task_id_seq,
  public.task_help_capacity_id_seq
to pair_research_runtime;

grant pair_research_runtime to pair_research_runtime_login;
revoke admin option for pair_research_runtime from pair_research_runtime_login;

alter table public.profile enable row level security;
alter table public."group" enable row level security;
alter table public.group_member enable row level security;
alter table public.group_role enable row level security;
alter table public.pairing enable row level security;
alter table public.pair enable row level security;
alter table public.task enable row level security;
alter table public.task_help_capacity enable row level security;
alter table public.affinity enable row level security;

create policy pair_research_runtime_select on public.profile
  for select to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public.profile
  for insert to pair_research_runtime with check (true);
create policy pair_research_runtime_update on public.profile
  for update to pair_research_runtime using (true) with check (true);

create policy pair_research_runtime_select on public."group"
  for select to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public."group"
  for insert to pair_research_runtime with check (true);
create policy pair_research_runtime_update on public."group"
  for update to pair_research_runtime using (true) with check (true);

create policy pair_research_runtime_all on public.group_member
  for all to pair_research_runtime using (true) with check (true);
create policy pair_research_runtime_all on public.group_role
  for all to pair_research_runtime using (true) with check (true);

create policy pair_research_runtime_select on public.pairing
  for select to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public.pairing
  for insert to pair_research_runtime with check (true);
create policy pair_research_runtime_select on public.pair
  for select to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public.pair
  for insert to pair_research_runtime with check (true);

create policy pair_research_runtime_all on public.task
  for all to pair_research_runtime using (true) with check (true);
create policy pair_research_runtime_select on public.task_help_capacity
  for select to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public.task_help_capacity
  for insert to pair_research_runtime with check (true);
create policy pair_research_runtime_delete on public.task_help_capacity
  for delete to pair_research_runtime using (true);
create policy pair_research_runtime_insert on public.affinity
  for insert to pair_research_runtime with check (true);

comment on role pair_research_runtime is
  'NOLOGIN capability role for Pair Research server-side Prisma operations.';
comment on role pair_research_runtime_login is
  'LOGIN role for the Pair Research Worker; password is managed outside migrations.';
