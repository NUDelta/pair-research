\set ON_ERROR_STOP on

begin;

do $$
declare
  fixture_user_id uuid;
  fixture_group_id uuid := gen_random_uuid();
  fixture_pairing_id uuid := gen_random_uuid();
  fixture_role_id bigint;
  fixture_task_id bigint;
begin
  select id into fixture_user_id from public.profile order by id limit 1;
  if fixture_user_id is null then
    raise exception 'isolated runtime DML verification requires at least one fixture profile';
  end if;

  update public.profile set email = email where id = fixture_user_id;

  insert into public."group" (id, name, creator_id)
    values (fixture_group_id, 'Phase 0B isolated runtime fixture', fixture_user_id);
  update public."group" set description = 'rollback-only' where id = fixture_group_id;

  insert into public.group_role (group_id, title)
    values (fixture_group_id, 'Fixture role') returning id into fixture_role_id;
  update public.group_role set title = 'Fixture role updated' where id = fixture_role_id;

  insert into public.group_member (group_id, user_id, role_id, permission, is_pending)
    values (fixture_group_id, fixture_user_id, fixture_role_id, 'owner', false);
  update public.group_member set permission = 'admin' where group_id = fixture_group_id and user_id = fixture_user_id;

  insert into public.task (group_id, user_id, description)
    values (fixture_group_id, fixture_user_id, 'rollback-only task') returning id into fixture_task_id;
  update public.task set description = 'rollback-only task updated' where id = fixture_task_id;

  insert into public.task_help_capacity (task_id, user_id, help_capacity)
    values (fixture_task_id, fixture_user_id, 3);

  insert into public.pairing (id, group_id) values (fixture_pairing_id, fixture_group_id);
  insert into public.pair (pairing_id, first_user, second_user)
    values (fixture_pairing_id, fixture_user_id, fixture_user_id);
  insert into public.affinity (helpee_id, helper_id, pairing_id, value)
    values (fixture_user_id, fixture_user_id, fixture_pairing_id, 1);

  insert into public.invitation_security_event (
    operation_id, event_kind, actor_id, group_id, request_digest, recipient_hash
  ) values (
    gen_random_uuid(), 'invitation', fixture_user_id, fixture_group_id,
    repeat('a', 64), repeat('b', 64)
  );

  delete from public.task_help_capacity where task_id = fixture_task_id;
  delete from public.task where id = fixture_task_id;
  delete from public.group_member where group_id = fixture_group_id;
  delete from public.group_role where group_id = fixture_group_id;
end
$$;

rollback;

select 'Phase 0B isolated rollback-only runtime DML verification passed.' as result;
