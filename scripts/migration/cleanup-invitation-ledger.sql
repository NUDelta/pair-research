\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

with expired as (
  select id
  from public.invitation_security_event
  where status = 'membership_created'
    and updated_at < now() - (:'retention_days' || ' days')::interval
  order by id
  limit :'batch_size'
  for update skip locked
), deleted as (
  delete from public.invitation_security_event event
  using expired
  where event.id = expired.id
  returning event.id
)
select count(*) as deleted_completed_events from deleted;

commit;
