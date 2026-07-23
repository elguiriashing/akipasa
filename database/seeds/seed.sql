-- Fictional demonstration records only.
-- Stable UUIDs plus replacement inside one transaction make every run deterministic.
-- Run only through `npm run db:seed:local`; its URL guard refuses non-local hosts.
begin;

delete from event_occurrences
where id in (
  '31000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000002'
);
delete from events
where id = '30000000-0000-4000-8000-000000000001';
delete from venues
where id = '11000000-0000-4000-8000-000000000001';

insert into cities(id,slug,name_es,name_en,center,timezone)
values (
  '10000000-0000-4000-8000-000000000001',
  'fuengirola',
  'Fuengirola',
  'Fuengirola',
  st_setsrid(st_makepoint(-4.624,36.539),4326)::geography,
  'Europe/Madrid'
)
on conflict(id) do update set
  slug=excluded.slug,
  name_es=excluded.name_es,
  name_en=excluded.name_en,
  center=excluded.center,
  timezone=excluded.timezone;

insert into categories(id,slug,name_es,name_en) values
  ('20000000-0000-4000-8000-000000000001','music','Música','Music'),
  ('20000000-0000-4000-8000-000000000002','social','Social','Social'),
  ('20000000-0000-4000-8000-000000000003','workshop','Taller','Workshop'),
  ('20000000-0000-4000-8000-000000000004','food','Gastronomía','Food'),
  ('20000000-0000-4000-8000-000000000005','family','Familia','Family'),
  ('20000000-0000-4000-8000-000000000006','sport','Deporte','Sport')
on conflict(id) do update set
  slug=excluded.slug,
  name_es=excluded.name_es,
  name_en=excluded.name_en;

insert into venues(
  id,city_id,slug,name,description_es,description_en,address,location,
  verified,accessibility,status
) values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'demo-patio-del-sol',
  'Patio del Sol · Demo',
  'Local ficticio para desarrollo y pruebas de AkiPasa.',
  'Fictional venue for AkiPasa development and testing.',
  'Calle Demo 1, Fuengirola',
  st_setsrid(st_makepoint(-4.624,36.539),4326)::geography,
  true,
  '{"step_free":true}'::jsonb,
  'published'
);

insert into events(
  id,venue_id,slug,title_es,title_en,description_es,description_en,
  category_id,price_cents,currency,source,sponsored,booking_url,status
) values (
  '30000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000001',
  'demo-musica-al-atardecer',
  'Música al atardecer · Demo',
  'Sunset music · Demo',
  'Evento completamente ficticio para comprobar descubrimiento, horarios y recurrencia.',
  'Entirely fictional event for testing discovery, schedules and recurrence.',
  '20000000-0000-4000-8000-000000000001',
  0,
  'EUR',
  'verified_venue',
  false,
  'https://example.com/akipasa-demo',
  'published'
);

insert into event_occurrences(id,event_id,starts_at,ends_at,status) values
  (
    '31000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
      + interval '1 day 19 hours',
    date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
      + interval '1 day 21 hours',
    'scheduled'
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
      + interval '8 days 19 hours',
    date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
      + interval '8 days 21 hours',
    'scheduled'
  );

commit;
