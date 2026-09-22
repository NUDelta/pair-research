\set ON_ERROR_STOP on

set timezone = 'UTC';
set datestyle = 'ISO, YMD';
set intervalstyle = 'postgres';
set bytea_output = 'hex';
set extra_float_digits = 3;
set lc_numeric = 'C';
set standard_conforming_strings = on;
set search_path = pg_catalog, public;

create temporary table restore_acceptance_row_counts (
  schema_name text not null,
  table_name text not null,
  row_count bigint not null
);

create temporary table restore_acceptance_sequence_state (
  schema_name text not null,
  sequence_name text not null,
  last_value text not null,
  is_called text not null
);

create temporary table restore_acceptance_table_fingerprints (
  schema_name text not null,
  table_name text not null,
  content_fingerprint text not null
);

do $acceptance$
declare
  relation record;
begin
  for relation in
    select schemaname, tablename
    from pg_tables
    where schemaname in ('public', 'auth', 'supabase_migrations')
    order by schemaname, tablename
  loop
    execute format(
      'insert into restore_acceptance_row_counts values (%L, %L, (select count(*) from %I.%I))',
      relation.schemaname,
      relation.tablename,
      relation.schemaname,
      relation.tablename
    );
    execute format(
      $statement$
        insert into restore_acceptance_table_fingerprints
        select %L, %L, md5(coalesce(string_agg(row_text, E'\n' order by row_text collate "C"), ''))
        from (
          select to_jsonb(source_row)::text as row_text
          from %I.%I source_row
        ) fingerprint_rows
      $statement$,
      relation.schemaname,
      relation.tablename,
      relation.schemaname,
      relation.tablename
    );
  end loop;

  for relation in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema in ('public', 'auth', 'supabase_migrations')
    order by sequence_schema, sequence_name
  loop
    execute format(
      'insert into restore_acceptance_sequence_state select %L, %L, last_value::text, is_called::text from %I.%I',
      relation.sequence_schema,
      relation.sequence_name,
      relation.sequence_schema,
      relation.sequence_name
    );
  end loop;
end
$acceptance$;

select category, item, detail, value
from (
  select
    'row_count'::text as category,
    schema_name || '.' || table_name as item,
    ''::text as detail,
    row_count::text as value
  from restore_acceptance_row_counts

  union all

  select
    'table_content_fingerprint',
    schema_name || '.' || table_name,
    'md5-of-sorted-jsonb-rows',
    content_fingerprint
  from restore_acceptance_table_fingerprints

  union all

  select
    'constraint_definition',
    namespace.nspname || '.' || relation.relname || '.' || constraint_record.conname,
    constraint_record.contype::text,
    pg_get_constraintdef(constraint_record.oid, true)
  from pg_constraint constraint_record
  join pg_namespace namespace on namespace.oid = constraint_record.connamespace
  join pg_class relation on relation.oid = constraint_record.conrelid
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'index_definition',
    schemaname || '.' || tablename || '.' || indexname,
    '',
    indexdef
  from pg_indexes
  where schemaname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'column_definition',
    namespace.nspname || '.' || relation.relname || '.' || attribute.attname,
    'position=' || attribute.attnum::text,
    'type=' || format_type(attribute.atttypid, attribute.atttypmod)
      || ';not_null=' || attribute.attnotnull::text
      || ';identity=' || coalesce(nullif(attribute.attidentity, '')::text, '<none>')
      || ';generated=' || coalesce(nullif(attribute.attgenerated, '')::text, '<none>')
      || ';collation=' || coalesce(collation_namespace.nspname || '.' || collation_record.collname, '<default>')
      || ';default=' || coalesce(pg_get_expr(attribute_default.adbin, attribute_default.adrelid, true), '<null>')
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  left join pg_attrdef attribute_default
    on attribute_default.adrelid = attribute.attrelid
   and attribute_default.adnum = attribute.attnum
  left join pg_collation collation_record on collation_record.oid = attribute.attcollation
  left join pg_namespace collation_namespace on collation_namespace.oid = collation_record.collnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and relation.relkind in ('r', 'p', 'v', 'm', 'c')
    and attribute.attnum > 0
    and not attribute.attisdropped

  union all

  select
    'type_definition',
    namespace.nspname || '.' || type_record.typname,
    'owner=' || pg_get_userbyid(type_record.typowner)
      || ';kind=' || type_record.typtype::text
      || ';category=' || type_record.typcategory::text
      || ';acl=' || coalesce(type_record.typacl::text, '<null>'),
    'formatted=' || format_type(type_record.oid, null)
      || ';not_null=' || type_record.typnotnull::text
      || ';default=' || coalesce(type_record.typdefault, '<null>')
      || ';collation=' || coalesce(collation_namespace.nspname || '.' || collation_record.collname, '<default>')
  from pg_type type_record
  join pg_namespace namespace on namespace.oid = type_record.typnamespace
  left join pg_collation collation_record on collation_record.oid = type_record.typcollation
  left join pg_namespace collation_namespace on collation_namespace.oid = collation_record.collnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and type_record.typcategory <> 'A'

  union all

  select
    'enum_definition',
    namespace.nspname || '.' || type_record.typname,
    'labels-in-sort-order',
    jsonb_agg(enum_record.enumlabel order by enum_record.enumsortorder)::text
  from pg_type type_record
  join pg_namespace namespace on namespace.oid = type_record.typnamespace
  join pg_enum enum_record on enum_record.enumtypid = type_record.oid
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
  group by namespace.nspname, type_record.typname

  union all

  select
    'domain_constraint_definition',
    namespace.nspname || '.' || type_record.typname || '.' || constraint_record.conname,
    constraint_record.contype::text,
    pg_get_constraintdef(constraint_record.oid, true)
  from pg_constraint constraint_record
  join pg_type type_record on type_record.oid = constraint_record.contypid
  join pg_namespace namespace on namespace.oid = type_record.typnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'range_definition',
    namespace.nspname || '.' || type_record.typname,
    'subtype=' || format_type(range_record.rngsubtype, null),
    'collation=' || coalesce(range_collation_namespace.nspname || '.' || range_collation.collname, '<default>')
      || ';canonical=' || range_record.rngcanonical::regprocedure::text
      || ';subdiff=' || range_record.rngsubdiff::regprocedure::text
  from pg_range range_record
  join pg_type type_record on type_record.oid = range_record.rngtypid
  join pg_namespace namespace on namespace.oid = type_record.typnamespace
  left join pg_collation range_collation on range_collation.oid = range_record.rngcollation
  left join pg_namespace range_collation_namespace on range_collation_namespace.oid = range_collation.collnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'trigger_definition',
    namespace.nspname || '.' || relation.relname || '.' || trigger_record.tgname,
    'enabled=' || trigger_record.tgenabled::text,
    pg_get_triggerdef(trigger_record.oid, true)
  from pg_trigger trigger_record
  join pg_class relation on relation.oid = trigger_record.tgrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and not trigger_record.tgisinternal

  union all

  select
    'function_definition',
    namespace.nspname || '.' || procedure.proname || '(' || pg_get_function_identity_arguments(procedure.oid) || ')',
    'owner=' || pg_get_userbyid(procedure.proowner)
      || ';kind=' || procedure.prokind::text
      || ';volatile=' || procedure.provolatile::text
      || ';security_definer=' || procedure.prosecdef::text
      || ';leakproof=' || procedure.proleakproof::text
      || ';parallel=' || procedure.proparallel::text
      || ';acl=' || coalesce(procedure.proacl::text, '<null>')
      || ';config=' || coalesce(array_to_string(procedure.proconfig, ','), '<null>'),
    pg_get_functiondef(procedure.oid)
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and procedure.prokind <> 'a'

  union all

  select
    'schema_security',
    namespace.nspname,
    'owner=' || pg_get_userbyid(namespace.nspowner),
    'acl=' || coalesce(namespace.nspacl::text, '<null>')
  from pg_namespace namespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'policy_definition',
    schemaname || '.' || tablename || '.' || policyname,
    permissive || ':' || cmd || ':' || array_to_string(roles, ','),
    'using=' || coalesce(qual, '<null>') || ';check=' || coalesce(with_check, '<null>')
  from pg_policies
  where schemaname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'table_security',
    namespace.nspname || '.' || relation.relname,
    'owner=' || pg_get_userbyid(relation.relowner),
    'rls=' || relation.relrowsecurity::text
      || ';force_rls=' || relation.relforcerowsecurity::text
      || ';acl=' || coalesce(relation.relacl::text, '<null>')
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and relation.relkind in ('r', 'p')

  union all

  select
    'sequence_state',
    schema_name || '.' || sequence_name,
    'last_value=' || last_value,
    'is_called=' || is_called
  from restore_acceptance_sequence_state

  union all

  select
    'sequence_definition',
    namespace.nspname || '.' || relation.relname,
    'type=' || format_type(sequence_record.seqtypid, null),
    'start=' || sequence_record.seqstart::text
      || ';increment=' || sequence_record.seqincrement::text
      || ';minimum=' || sequence_record.seqmin::text
      || ';maximum=' || sequence_record.seqmax::text
      || ';cache=' || sequence_record.seqcache::text
      || ';cycle=' || sequence_record.seqcycle::text
  from pg_sequence sequence_record
  join pg_class relation on relation.oid = sequence_record.seqrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'sequence_security',
    namespace.nspname || '.' || relation.relname,
    'owner=' || pg_get_userbyid(relation.relowner),
    'acl=' || coalesce(relation.relacl::text, '<null>')
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and relation.relkind = 'S'

  union all

  select
    'view_definition',
    schemaname || '.' || viewname,
    'owner=' || viewowner,
    definition
  from pg_views
  where schemaname in ('public', 'auth', 'supabase_migrations')

  union all

  select
    'relation_options',
    namespace.nspname || '.' || relation.relname,
    relation.relkind::text,
    coalesce(array_to_string(relation.reloptions, ','), '<null>')
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
    and relation.relkind in ('r', 'p', 'v', 'm', 'S')

  union all

  select
    'default_acl',
    coalesce(namespace.nspname, '<global>'),
    pg_get_userbyid(default_acl.defaclrole) || ':' || default_acl.defaclobjtype::text,
    coalesce(default_acl.defaclacl::text, '<null>')
  from pg_default_acl default_acl
  left join pg_namespace namespace on namespace.oid = default_acl.defaclnamespace
  where namespace.nspname in ('public', 'auth', 'supabase_migrations')
     or namespace.nspname is null

  union all

  select
    'database_definition',
    database_record.datname,
    'encoding=' || pg_encoding_to_char(database_record.encoding)
      || ';locale_provider=' || coalesce(to_jsonb(database_record)->>'datlocprovider', '<null>'),
    'collate=' || database_record.datcollate
      || ';ctype=' || database_record.datctype
      || ';locale=' || coalesce(
        to_jsonb(database_record)->>'datlocale',
        to_jsonb(database_record)->>'daticulocale',
        '<null>'
      )
      || ';collation_version=' || coalesce(database_record.datcollversion, '<null>')
  from pg_database database_record
  where database_record.datname = current_database()

  union all

  select
    'effective_table_privilege',
    tables.table_schema || '.' || tables.table_name,
    roles.role_name || ':' || privileges.privilege_name,
    has_table_privilege(
      roles.role_name,
      format('%I.%I', tables.table_schema, tables.table_name),
      privileges.privilege_name
    )::text
  from information_schema.tables tables
  cross join (
    select rolname as role_name
    from pg_roles
    where rolname in (
      'anon',
      'authenticated',
      'service_role',
      'prisma',
      'pair_research_runtime',
      'pair_research_runtime_login'
    )
  ) roles
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) privileges(privilege_name)
  where tables.table_schema in ('public', 'auth', 'supabase_migrations')
    and tables.table_type = 'BASE TABLE'

  union all

  select
    'effective_schema_privilege',
    schemas.schema_name,
    roles.role_name || ':' || privileges.privilege_name,
    has_schema_privilege(
      roles.role_name,
      schemas.schema_name,
      privileges.privilege_name
    )::text
  from (values ('public'), ('auth'), ('supabase_migrations')) schemas(schema_name)
  cross join (
    select rolname as role_name
    from pg_roles
    where rolname in (
      'anon',
      'authenticated',
      'service_role',
      'prisma',
      'pair_research_runtime',
      'pair_research_runtime_login'
    )
  ) roles
  cross join (values ('USAGE'), ('CREATE')) privileges(privilege_name)
) summary
order by category, item, detail, value;
