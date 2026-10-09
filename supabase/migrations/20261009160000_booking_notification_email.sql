-- Optional owner-selected address for booking notifications.
-- Keep booking contacts private: only venue managers read this setting.
alter table public.venue_booking_settings
  add column if not exists notification_email text;
alter table public.venue_booking_settings
  add constraint venue_booking_notification_email_valid
  check (notification_email is null or (
    char_length(notification_email) between 5 and 254
    and notification_email ~* '^[A-Z0-9._%+\\-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
  ));
comment on column public.venue_booking_settings.notification_email
  is 'Optional explicit venue recipient for approved booking confirmations.';
