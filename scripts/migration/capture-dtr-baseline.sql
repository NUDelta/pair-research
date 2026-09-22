\set ON_ERROR_STOP on

select exists (
  select 1 from public."group" where id = :'dtr_group_id'::uuid
) as dtr_group_exists \gset
\if :dtr_group_exists
\else
  \echo 'Error: DTR_GROUP_ID does not identify an existing group.'
  \quit 1
\endif

select jsonb_pretty(jsonb_build_object(
  'captured_at', now(),
  'source_identity', jsonb_build_object(
    'project_ref', :'dtr_project_ref',
    'source_label', :'dtr_source_label',
    'connection_form', :'dtr_connection_form',
    'connection_target', :'dtr_connection_target',
    'database', current_database(),
    'database_user', current_user
  ),
  'group', (
    select to_jsonb(g)
    from public."group" g
    where g.id = :'dtr_group_id'::uuid
  ),
  'memberships', coalesce((
    select jsonb_agg(to_jsonb(m) order by m.user_id)
    from public.group_member m
    where m.group_id = :'dtr_group_id'::uuid
  ), '[]'::jsonb),
  'group_roles', coalesce((
    select jsonb_agg(to_jsonb(r) order by r.id)
    from public.group_role r
    where r.group_id = :'dtr_group_id'::uuid
  ), '[]'::jsonb),
  'active_pairing', (
    select to_jsonb(p)
    from public.pairing p
    where p.id = (
      select g.active_pairing_id
      from public."group" g
      where g.id = :'dtr_group_id'::uuid
    )
  ),
  'active_pairs', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.id)
    from public.pair p
    where p.pairing_id = (
      select g.active_pairing_id
      from public."group" g
      where g.id = :'dtr_group_id'::uuid
    )
  ), '[]'::jsonb),
  'active_affinities', coalesce((
    select jsonb_agg(to_jsonb(a) order by a.id)
    from public.affinity a
    where a.pairing_id = (
      select g.active_pairing_id
      from public."group" g
      where g.id = :'dtr_group_id'::uuid
    )
  ), '[]'::jsonb),
  'group_tasks', coalesce((
    select jsonb_agg(to_jsonb(t) order by t.id)
    from public.task t
    where t.group_id = :'dtr_group_id'::uuid
  ), '[]'::jsonb),
  'group_task_help_capacities', coalesce((
    select jsonb_agg(to_jsonb(c) order by c.id)
    from public.task_help_capacity c
    join public.task t on t.id = c.task_id
    where t.group_id = :'dtr_group_id'::uuid
  ), '[]'::jsonb)
));
