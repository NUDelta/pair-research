create type public.group_permission as enum ('owner', 'admin', 'member');

alter table public.group_member
  add column permission public.group_permission;

update public.group_member as group_member
set permission = case
  when group_member.user_id = groups.creator_id then 'owner'::public.group_permission
  when group_member.is_admin then 'admin'::public.group_permission
  else 'member'::public.group_permission
end
from public."group" as groups
where group_member.group_id = groups.id;

alter table public.group_member
  alter column permission set default 'member'::public.group_permission,
  alter column permission set not null;

alter table public.group_member
  drop column is_admin;
