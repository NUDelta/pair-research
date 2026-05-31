do $$
begin
  if exists (
    select 1
    from public."group" as groups
    where not exists (
      select 1
      from public.group_member as members
      where members.group_id = groups.id
        and members.permission = 'owner'::public.group_permission
        and members.is_pending = false
    )
  ) then
    raise exception 'Every group must have at least one confirmed owner.';
  end if;
end $$;
