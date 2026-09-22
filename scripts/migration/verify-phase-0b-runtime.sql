\set ON_ERROR_STOP on

do $$
begin
  if current_user <> 'pair_research_runtime_login' then
    raise exception 'expected pair_research_runtime_login, got %', current_user;
  end if;
  if not pg_has_role(current_user, 'pair_research_runtime', 'USAGE')
    or pg_has_role(current_user, 'migration_private_owner', 'MEMBER')
    or has_schema_privilege(current_user, 'public', 'CREATE')
    or has_schema_privilege(current_user, 'auth', 'USAGE')
    or has_schema_privilege(current_user, 'migration_private', 'USAGE')
  then
    raise exception 'runtime role boundary is incorrect';
  end if;
end
$$;

select count(*) >= 0 as profile_select_works from public.profile;
select count(*) >= 0 as group_select_works from public."group";
select count(*) >= 0 as membership_select_works from public.group_member;

do $$
begin
  begin
    execute 'set role postgres';
    raise exception 'runtime login unexpectedly set role postgres';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from auth.users limit 1;
    raise exception 'runtime login unexpectedly read auth.users';
  exception when insufficient_privilege then
    null;
  end;

  begin
    execute 'create table public.phase_0b_runtime_must_not_create (id integer)';
    raise exception 'runtime login unexpectedly created a public table';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

select 'Phase 0B direct runtime boundary/read verification passed.' as result;
