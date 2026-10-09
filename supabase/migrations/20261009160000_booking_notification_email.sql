-- Booking confirmation recipients and durable, idempotent email queue.
-- Existing booking requests, slots and configurations remain unchanged.
alter table public.venue_booking_settings
  add column if not exists notification_email text;
alter table public.venue_booking_settings
  add constraint venue_booking_notification_email_valid
  check (notification_email is null or (
    char_length(notification_email) between 5 and 254
    and notification_email ~* '^[^ @]+@[^ @]+[.][^ @]+$'
  ));

create table public.booking_confirmation_emails (
  booking_id uuid not null references public.booking_requests(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  audience text not null check (audience in ('customer','venue')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts between 0 and 100),
  attempted_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  primary key (booking_id,audience)
);
create index booking_confirmation_emails_venue_idx on public.booking_confirmation_emails(venue_id,status);
alter table public.booking_confirmation_emails enable row level security;
revoke all on public.booking_confirmation_emails from anon,authenticated;
grant select,insert,update on public.booking_confirmation_emails to authenticated;
create policy booking_confirmation_manager on public.booking_confirmation_emails
  for all to authenticated
  using (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]))
  with check (public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));

create function public.approve_booking_and_queue_emails(p_venue uuid,p_booking uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare v_email text; v_venue_email text; v_changed uuid;
begin
  if not public.is_venue_member(p_venue,array['owner','manager']::public.venue_member_role[]) then
    raise exception 'venue manager required' using errcode = '42501';
  end if;
  update public.booking_requests
    set status='confirmed',updated_at=now()
    where id=p_booking and venue_id=p_venue and status='requested'
    returning id, contact_email into v_changed, v_email;
  if v_changed is null then return false; end if;
  insert into public.booking_confirmation_emails(booking_id,venue_id,audience,recipient)
    values(p_booking,p_venue,'customer',v_email)
    on conflict (booking_id,audience) do nothing;
  select nullif(btrim(notification_email),'') into v_venue_email
  from public.venue_booking_settings where venue_id=p_venue;
  if v_venue_email is not null then
    insert into public.booking_confirmation_emails(booking_id,venue_id,audience,recipient)
      values(p_booking,p_venue,'venue',v_venue_email)
      on conflict (booking_id,audience) do nothing;
  end if;
  return true;
end;
$$;
revoke all on function public.approve_booking_and_queue_emails(uuid,uuid) from public,anon;
grant execute on function public.approve_booking_and_queue_emails(uuid,uuid) to authenticated;

comment on table public.booking_confirmation_emails is
  'Manager-scoped transactional email queue. One confirmation per booking and audience.';
