-- Production baseline configuration (Cities & Categories).
-- Fictional demonstration records removed.
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

commit;

