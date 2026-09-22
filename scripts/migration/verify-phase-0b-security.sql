\set ON_ERROR_STOP on

do $$
declare
  role_row record;
  application_table text;
  sequence_name text;
  privilege_name text;
  required_privileges text[];
begin
  select * into role_row from pg_roles where rolname = 'pair_research_runtime';
  if role_row is null or role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
    or role_row.rolcreaterole or role_row.rolbypassrls or role_row.rolinherit
  then
    raise exception 'pair_research_runtime attributes are not least privilege';
  end if;

  select * into role_row from pg_roles where rolname = 'pair_research_runtime_login';
  if role_row is null or not role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
    or role_row.rolcreaterole or role_row.rolbypassrls or not role_row.rolinherit
  then
    raise exception 'pair_research_runtime_login attributes are not least privilege';
  end if;

  if not pg_has_role('pair_research_runtime_login', 'pair_research_runtime', 'MEMBER') then
    raise exception 'runtime login is missing capability-role membership';
  end if;
  if not exists (
    select 1
    from pg_auth_members m
    join pg_roles member_role on member_role.oid = m.member
    join pg_roles granted_role on granted_role.oid = m.roleid
    where member_role.rolname = 'pair_research_runtime_login'
      and granted_role.rolname = 'pair_research_runtime'
      and not m.admin_option
      and coalesce((to_jsonb(m) ->> 'inherit_option')::boolean, true)
      and coalesce((to_jsonb(m) ->> 'set_option')::boolean, true)
  ) then
    raise exception 'runtime capability-role membership options are incorrect';
  end if;
  if exists (
    select 1 from pg_auth_members m
    join pg_roles member_role on member_role.oid = m.member
    join pg_roles granted_role on granted_role.oid = m.roleid
    where member_role.rolname in ('pair_research_runtime', 'pair_research_runtime_login')
      and not (member_role.rolname = 'pair_research_runtime_login' and granted_role.rolname = 'pair_research_runtime')
  ) then
    raise exception 'runtime roles have unexpected role memberships';
  end if;

  if not has_database_privilege('pair_research_runtime', current_database(), 'CONNECT')
    or has_database_privilege('pair_research_runtime', current_database(), 'CREATE')
    or has_schema_privilege('pair_research_runtime', 'public', 'CREATE')
    or has_schema_privilege('pair_research_runtime_login', 'public', 'CREATE')
  then
    raise exception 'runtime database/schema privileges are not least privilege';
  end if;

  if exists (
    select 1 from pg_class
    where relowner in (select oid from pg_roles where rolname in ('pair_research_runtime', 'pair_research_runtime_login'))
  ) then
    raise exception 'runtime role owns a database object';
  end if;

  foreach application_table in array array[
    'profile', 'group', 'group_member', 'group_role', 'pairing', 'pair',
    'task', 'task_help_capacity', 'affinity', 'invitation_security_event'
  ] loop
    required_privileges := case application_table
      when 'profile' then array['SELECT','INSERT','UPDATE']
      when 'group' then array['SELECT','INSERT','UPDATE']
      when 'group_member' then array['SELECT','INSERT','UPDATE','DELETE']
      when 'group_role' then array['SELECT','INSERT','UPDATE','DELETE']
      when 'pairing' then array['SELECT','INSERT']
      when 'pair' then array['SELECT','INSERT']
      when 'task' then array['SELECT','INSERT','UPDATE','DELETE']
      when 'task_help_capacity' then array['SELECT','INSERT','DELETE']
      when 'affinity' then array['INSERT']
      when 'invitation_security_event' then array['SELECT','INSERT','UPDATE']
    end;

    foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if (privilege_name = any(required_privileges)) <> has_table_privilege(
        'pair_research_runtime', format('public.%I', application_table), privilege_name
      ) then
        raise exception 'runtime privilege % on public.% is incorrect', privilege_name, application_table;
      end if;
    end loop;

    if not (select relrowsecurity from pg_class where oid = format('public.%I', application_table)::regclass) then
      raise exception 'RLS is not enabled on public.%', application_table;
    end if;

    foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('anon', format('public.%I', application_table), privilege_name)
        or has_table_privilege('authenticated', format('public.%I', application_table), privilege_name)
        or has_table_privilege('service_role', format('public.%I', application_table), privilege_name)
      then
        raise exception 'Data API role retains % on public.%', privilege_name, application_table;
      end if;
    end loop;
  end loop;

  foreach sequence_name in array array[
    'affinity_id_seq', 'group_member_id_seq', 'group_role_id_seq', 'pair_id_seq',
    'task_id_seq', 'task_help_capacity_id_seq', 'invitation_security_event_id_seq'
  ] loop
    if not has_sequence_privilege('pair_research_runtime', format('public.%I', sequence_name), 'USAGE')
      or has_sequence_privilege('pair_research_runtime', format('public.%I', sequence_name), 'SELECT')
      or has_sequence_privilege('pair_research_runtime', format('public.%I', sequence_name), 'UPDATE')
      or has_sequence_privilege('anon', format('public.%I', sequence_name), 'USAGE,SELECT,UPDATE')
      or has_sequence_privilege('authenticated', format('public.%I', sequence_name), 'USAGE,SELECT,UPDATE')
      or has_sequence_privilege('service_role', format('public.%I', sequence_name), 'USAGE,SELECT,UPDATE')
    then
      raise exception 'sequence privilege matrix is incorrect for public.%', sequence_name;
    end if;
  end loop;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'affinity', 'group', 'group_member', 'group_role', 'pair', 'pairing',
        'profile', 'task', 'task_help_capacity', 'invitation_security_event'
      ])
      and roles <> array['pair_research_runtime']::name[]
  ) then
    raise exception 'non-runtime application-table policy still exists';
  end if;

  if exists (
    select 1 from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    left join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where owner_role.rolname in ('postgres', 'supabase_admin')
      and n.nspname = 'public'
      and coalesce(grantee_role.rolname, 'PUBLIC') in ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ) then
    raise exception 'unsafe public-schema default ACL remains';
  end if;

  if exists (
    select 1 from information_schema.table_privileges
    where table_schema = 'auth' and grantee in ('pair_research_runtime', 'pair_research_runtime_login')
  ) then
    raise exception 'runtime role has direct auth table privileges';
  end if;

  if (select nspowner <> (select oid from pg_roles where rolname = 'migration_private_owner')
      from pg_namespace where nspname = 'migration_private')
    or has_schema_privilege('pair_research_runtime', 'migration_private', 'USAGE')
    or has_schema_privilege('pair_research_runtime_login', 'migration_private', 'USAGE')
    or has_schema_privilege('anon', 'migration_private', 'USAGE')
    or has_schema_privilege('authenticated', 'migration_private', 'USAGE')
    or has_schema_privilege('service_role', 'migration_private', 'USAGE')
  then
    raise exception 'migration_private ownership or schema ACL is incorrect';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'migration_private'
      and c.relkind in ('r', 'p', 'S', 'v', 'm', 'f')
      and c.relowner <> (select oid from pg_roles where rolname = 'migration_private_owner')
  ) or exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'migration_private'
      and t.typowner <> (select oid from pg_roles where rolname = 'migration_private_owner')
  ) then
    raise exception 'migration_private contains an object owned by another role';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'migration_private'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  ) or exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'migration_private'
  ) then
    raise exception 'migration_private RLS or policy state is incorrect';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault(case c.relkind when 'S' then 'S'::"char" else 'r'::"char" end, c.relowner))) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where n.nspname = 'migration_private'
      and coalesce(grantee_role.rolname, 'PUBLIC') in (
        'PUBLIC', 'anon', 'authenticated', 'service_role',
        'pair_research_runtime', 'pair_research_runtime_login'
      )
  ) then
    raise exception 'migration_private object ACL exposes a browser or runtime role';
  end if;

  if exists (
    select 1
    from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    left join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where owner_role.rolname = 'migration_private_owner'
      and n.nspname = 'migration_private'
      and coalesce(grantee_role.rolname, 'PUBLIC') in (
        'PUBLIC', 'anon', 'authenticated', 'service_role',
        'pair_research_runtime', 'pair_research_runtime_login'
      )
  ) then
    raise exception 'migration_private default ACL exposes a browser or runtime role';
  end if;
end
$$;

select 'Phase 0B security catalog verification passed.' as result;
