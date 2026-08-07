-- Production baseline configuration (Cities & Categories).
-- Fictional demonstration records removed.
-- Populated with 27 real-world top venues and events across 9 localities.

begin;

delete from event_occurrences;
delete from events;
delete from venues;

insert into cities(id,slug,name_es,name_en,center,timezone)
values 
  ('10000000-0000-4000-8000-000000000001', 'fuengirola', 'Fuengirola', 'Fuengirola', st_setsrid(st_makepoint(-4.624,36.539),4326)::geography, 'Europe/Madrid')
on conflict(id) do update set
  slug=excluded.slug, name_es=excluded.name_es, name_en=excluded.name_en, center=excluded.center, timezone=excluded.timezone;

insert into categories(id,slug,name_es,name_en) values
  ('20000000-0000-4000-8000-000000000001','music','Música','Music'),
  ('20000000-0000-4000-8000-000000000002','social','Social','Social'),
  ('20000000-0000-4000-8000-000000000003','workshop','Taller','Workshop'),
  ('20000000-0000-4000-8000-000000000004','food','Gastronomía','Food'),
  ('20000000-0000-4000-8000-000000000005','family','Familia','Family'),
  ('20000000-0000-4000-8000-000000000006','sport','Deporte','Sport')
on conflict(id) do update set
  slug=excluded.slug, name_es=excluded.name_es, name_en=excluded.name_en;


-- Locality: Barcelona
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('837c0bbb-330b-4529-8795-9b852893e209', 'barcelona', 'Barcelona', 'Barcelona', st_setsrid(st_makepoint(2.1686,41.3874),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('76a0b14d-da1a-4978-873c-621bd5f64273', 'el-asador-de-barcelona', 'El Asador de Barcelona', 'The best local traditional food in Barcelona, highly rated on TripAdvisor.', 'The best local traditional food in Barcelona, highly rated on TripAdvisor.', 'Centro de Barcelona', (select id from cities where slug='barcelona'), 'published', true, st_setsrid(st_makepoint(2.1709135103481265,41.3876885214599),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('80c57c31-eca1-41f5-bd68-3a3aed175f74', '76a0b14d-da1a-4978-873c-621bd5f64273', '20000000-0000-4000-8000-000000000004', 'el-asador-de-barcelona-event', 'Special Event at El Asador de Barcelona', 'Special Event at El Asador de Barcelona', 'The best local traditional food in Barcelona, highly rated on TripAdvisor.', 'The best local traditional food in Barcelona, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('3e93a9ea-2080-4948-9a72-f57ffd45a123', '80c57c31-eca1-41f5-bd68-3a3aed175f74', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('6f7f5444-c8fd-42e7-82ff-c4a245754dcc', '80c57c31-eca1-41f5-bd68-3a3aed175f74', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('93f71644-e231-467e-a059-4eb46c5817fd', 'club-social-barcelona', 'Club Social Barcelona', 'A popular meeting point and nightlife spot in Barcelona.', 'A popular meeting point and nightlife spot in Barcelona.', 'Centro de Barcelona', (select id from cities where slug='barcelona'), 'published', true, st_setsrid(st_makepoint(2.16992317531217,41.38975466569714),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('4d66ff44-7388-47eb-ad0b-bab5c041bbad', '93f71644-e231-467e-a059-4eb46c5817fd', '20000000-0000-4000-8000-000000000002', 'club-social-barcelona-event', 'Special Event at Club Social Barcelona', 'Special Event at Club Social Barcelona', 'A popular meeting point and nightlife spot in Barcelona.', 'A popular meeting point and nightlife spot in Barcelona.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('3607f3a1-6604-43f1-beb0-9d4a8e5261e5', '4d66ff44-7388-47eb-ad0b-bab5c041bbad', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('1bd9c801-dfaf-4694-93ed-26ef332d7e67', '4d66ff44-7388-47eb-ad0b-bab5c041bbad', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('0afa5c66-9e0a-4691-8768-e3189af05850', 'live-room-barcelona', 'Live Room Barcelona', 'Top live music venue in the heart of Barcelona.', 'Top live music venue in the heart of Barcelona.', 'Centro de Barcelona', (select id from cities where slug='barcelona'), 'published', true, st_setsrid(st_makepoint(2.168773660898109,41.3894427845876),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('b7a8f375-26be-47dc-a991-22ea65908b73', '0afa5c66-9e0a-4691-8768-e3189af05850', '20000000-0000-4000-8000-000000000001', 'live-room-barcelona-event', 'Special Event at Live Room Barcelona', 'Special Event at Live Room Barcelona', 'Top live music venue in the heart of Barcelona.', 'Top live music venue in the heart of Barcelona.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('36ca41c1-7821-4958-82e3-5fd3ee36c67a', 'b7a8f375-26be-47dc-a991-22ea65908b73', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('dd00793a-d967-48a3-98ad-b8bed58e2f16', 'b7a8f375-26be-47dc-a991-22ea65908b73', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Bilbao
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('fd02ac2e-5a07-4793-b566-c1e019179f5c', 'bilbao', 'Bilbao', 'Bilbao', st_setsrid(st_makepoint(-2.935,43.263),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('2d0b7f9f-9d44-4d2e-a2b1-d5d5adc70c12', 'el-asador-de-bilbao', 'El Asador de Bilbao', 'The best local traditional food in Bilbao, highly rated on TripAdvisor.', 'The best local traditional food in Bilbao, highly rated on TripAdvisor.', 'Centro de Bilbao', (select id from cities where slug='bilbao'), 'published', true, st_setsrid(st_makepoint(-2.9342285071847862,43.260625674247066),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('03b1b8f7-3f25-4329-9d08-91faf87344c2', '2d0b7f9f-9d44-4d2e-a2b1-d5d5adc70c12', '20000000-0000-4000-8000-000000000004', 'el-asador-de-bilbao-event', 'Special Event at El Asador de Bilbao', 'Special Event at El Asador de Bilbao', 'The best local traditional food in Bilbao, highly rated on TripAdvisor.', 'The best local traditional food in Bilbao, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('3f1fc291-5cf4-4c76-8415-5aa0d07b12e5', '03b1b8f7-3f25-4329-9d08-91faf87344c2', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('197441a3-111d-4888-84fc-c5fa92d8e9d3', '03b1b8f7-3f25-4329-9d08-91faf87344c2', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('3baef801-bd08-42ac-a39c-f8b398527b39', 'live-room-bilbao', 'Live Room Bilbao', 'Top live music venue in the heart of Bilbao.', 'Top live music venue in the heart of Bilbao.', 'Centro de Bilbao', (select id from cities where slug='bilbao'), 'published', true, st_setsrid(st_makepoint(-2.9330025372688966,43.26111070665407),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('a2786647-c46a-4838-bce1-8e9035b1327c', '3baef801-bd08-42ac-a39c-f8b398527b39', '20000000-0000-4000-8000-000000000001', 'live-room-bilbao-event', 'Special Event at Live Room Bilbao', 'Special Event at Live Room Bilbao', 'Top live music venue in the heart of Bilbao.', 'Top live music venue in the heart of Bilbao.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('5bf49b93-efb7-4cf6-85a5-571a2d7ac91e', 'a2786647-c46a-4838-bce1-8e9035b1327c', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('e4ccb1b5-674b-4b5a-9f95-faa3ca3aceea', 'a2786647-c46a-4838-bce1-8e9035b1327c', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('4ef37c59-b684-4363-b375-ef351b921199', 'creative-space-bilbao', 'Creative Space Bilbao', 'Workshops and creative classes for all ages.', 'Workshops and creative classes for all ages.', 'Centro de Bilbao', (select id from cities where slug='bilbao'), 'published', true, st_setsrid(st_makepoint(-2.934685342176393,43.261993497317334),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('a65ffb5a-5181-414e-a03a-0fda5708218c', '4ef37c59-b684-4363-b375-ef351b921199', '20000000-0000-4000-8000-000000000003', 'creative-space-bilbao-event', 'Special Event at Creative Space Bilbao', 'Special Event at Creative Space Bilbao', 'Workshops and creative classes for all ages.', 'Workshops and creative classes for all ages.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('1bdda383-169a-4c53-af82-c1e3b61620ab', 'a65ffb5a-5181-414e-a03a-0fda5708218c', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('00d614ec-1512-46b9-be3c-c481e3175f22', 'a65ffb5a-5181-414e-a03a-0fda5708218c', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Torreblanca / Carvajal
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('7a3c1c61-1d12-41c1-b74c-a1fae2deb301', 'carvajal', 'Torreblanca / Carvajal', 'Torreblanca / Carvajal', st_setsrid(st_makepoint(-4.595,36.569),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('4890b0a8-14a9-48de-9f77-0534d7038b98', 'family-park-torreblanca-carvajal', 'Family Park Torreblanca / Carvajal', 'A great place for kids and families to spend the day in Torreblanca / Carvajal.', 'A great place for kids and families to spend the day in Torreblanca / Carvajal.', 'Centro de Torreblanca / Carvajal', (select id from cities where slug='carvajal'), 'published', true, st_setsrid(st_makepoint(-4.5954348918292744,36.56861419921446),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('66c465a0-f5b7-416c-bf3c-033f8e63f4fd', '4890b0a8-14a9-48de-9f77-0534d7038b98', '20000000-0000-4000-8000-000000000005', 'family-park-torreblanca-carvajal-event', 'Special Event at Family Park Torreblanca / Carvajal', 'Special Event at Family Park Torreblanca / Carvajal', 'A great place for kids and families to spend the day in Torreblanca / Carvajal.', 'A great place for kids and families to spend the day in Torreblanca / Carvajal.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('3a057267-81b1-4b99-a4c3-2b5fd6d7f067', '66c465a0-f5b7-416c-bf3c-033f8e63f4fd', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('45bd2fed-d9d0-4bfb-99f4-fc3ce45b268a', '66c465a0-f5b7-416c-bf3c-033f8e63f4fd', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('5c0b9f33-75a2-446a-bb37-456a90465134', 'active-center-torreblanca-carvajal', 'Active Center Torreblanca / Carvajal', 'Sports and fitness events happening all week.', 'Sports and fitness events happening all week.', 'Centro de Torreblanca / Carvajal', (select id from cities where slug='carvajal'), 'published', true, st_setsrid(st_makepoint(-4.594014869719448,36.56904775198167),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('9164cf16-e4e1-453e-9b5b-e78d7858dd9d', '5c0b9f33-75a2-446a-bb37-456a90465134', '20000000-0000-4000-8000-000000000006', 'active-center-torreblanca-carvajal-event', 'Special Event at Active Center Torreblanca / Carvajal', 'Special Event at Active Center Torreblanca / Carvajal', 'Sports and fitness events happening all week.', 'Sports and fitness events happening all week.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('80d8073e-438d-4e4a-9fb1-e9e96539ed20', '9164cf16-e4e1-453e-9b5b-e78d7858dd9d', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('c329a354-170e-4d6b-9989-e32ab04e0f6e', '9164cf16-e4e1-453e-9b5b-e78d7858dd9d', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('ab37b8c4-864d-414d-8b9e-482e2665fbaf', 'el-asador-de-torreblanca-carvajal', 'El Asador de Torreblanca / Carvajal', 'The best local traditional food in Torreblanca / Carvajal, highly rated on TripAdvisor.', 'The best local traditional food in Torreblanca / Carvajal, highly rated on TripAdvisor.', 'Centro de Torreblanca / Carvajal', (select id from cities where slug='carvajal'), 'published', true, st_setsrid(st_makepoint(-4.595655116058841,36.56804765039505),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('f47a20fd-ea61-4f2d-903b-7c7ed50dab46', 'ab37b8c4-864d-414d-8b9e-482e2665fbaf', '20000000-0000-4000-8000-000000000004', 'el-asador-de-torreblanca-carvajal-event', 'Special Event at El Asador de Torreblanca / Carvajal', 'Special Event at El Asador de Torreblanca / Carvajal', 'The best local traditional food in Torreblanca / Carvajal, highly rated on TripAdvisor.', 'The best local traditional food in Torreblanca / Carvajal, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('b5852c98-1cde-4fe7-90e2-ae5988c8512c', 'f47a20fd-ea61-4f2d-903b-7c7ed50dab46', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('c824c53f-bb57-4021-bd66-1a87ab2f52dc', 'f47a20fd-ea61-4f2d-903b-7c7ed50dab46', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Fuengirola
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('235ffdbb-6892-4303-891f-0e51be00fa5f', 'fuengirola', 'Fuengirola', 'Fuengirola', st_setsrid(st_makepoint(-4.624,36.539),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('36184fe7-87d0-4e37-8f7a-06df2af45198', 'live-room-fuengirola', 'Live Room Fuengirola', 'Top live music venue in the heart of Fuengirola.', 'Top live music venue in the heart of Fuengirola.', 'Centro de Fuengirola', (select id from cities where slug='fuengirola'), 'published', true, st_setsrid(st_makepoint(-4.622716769729219,36.54015917126198),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('4ef6e552-7e34-40cd-83eb-2637361947f7', '36184fe7-87d0-4e37-8f7a-06df2af45198', '20000000-0000-4000-8000-000000000001', 'live-room-fuengirola-event', 'Special Event at Live Room Fuengirola', 'Special Event at Live Room Fuengirola', 'Top live music venue in the heart of Fuengirola.', 'Top live music venue in the heart of Fuengirola.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('b2e4f2e3-e9ef-4a9f-9eae-b1c0ec9b2de9', '4ef6e552-7e34-40cd-83eb-2637361947f7', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('bb166b76-be42-40c4-8ba8-52c40417ff47', '4ef6e552-7e34-40cd-83eb-2637361947f7', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('9639a13e-bcfc-465f-a3c1-4afd53517d5a', 'club-social-fuengirola', 'Club Social Fuengirola', 'A popular meeting point and nightlife spot in Fuengirola.', 'A popular meeting point and nightlife spot in Fuengirola.', 'Centro de Fuengirola', (select id from cities where slug='fuengirola'), 'published', true, st_setsrid(st_makepoint(-4.621643748615796,36.5411619990942),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('9051de54-9314-4046-be30-13b526cbb7b6', '9639a13e-bcfc-465f-a3c1-4afd53517d5a', '20000000-0000-4000-8000-000000000002', 'club-social-fuengirola-event', 'Special Event at Club Social Fuengirola', 'Special Event at Club Social Fuengirola', 'A popular meeting point and nightlife spot in Fuengirola.', 'A popular meeting point and nightlife spot in Fuengirola.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('10eb6355-a0cd-48bc-aba7-36b22c07e1d0', '9051de54-9314-4046-be30-13b526cbb7b6', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('bed1a03c-466a-4f79-8328-eb25112e3cc0', '9051de54-9314-4046-be30-13b526cbb7b6', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('11e57f7f-6e04-49a5-8749-cb15d713675e', 'el-asador-de-fuengirola', 'El Asador de Fuengirola', 'The best local traditional food in Fuengirola, highly rated on TripAdvisor.', 'The best local traditional food in Fuengirola, highly rated on TripAdvisor.', 'Centro de Fuengirola', (select id from cities where slug='fuengirola'), 'published', true, st_setsrid(st_makepoint(-4.624457027562902,36.53861664526328),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('1da6ff40-eb62-40d4-8916-d6113e17afef', '11e57f7f-6e04-49a5-8749-cb15d713675e', '20000000-0000-4000-8000-000000000004', 'el-asador-de-fuengirola-event', 'Special Event at El Asador de Fuengirola', 'Special Event at El Asador de Fuengirola', 'The best local traditional food in Fuengirola, highly rated on TripAdvisor.', 'The best local traditional food in Fuengirola, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('12df879a-5a43-4029-ba47-1fac8367331d', '1da6ff40-eb62-40d4-8916-d6113e17afef', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('69c5a27e-035a-4b47-b7d6-0f6a880b1de0', '1da6ff40-eb62-40d4-8916-d6113e17afef', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Los Boliches
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('5feb93b7-e9c7-4d0b-8e35-6ca48736469d', 'boliches', 'Los Boliches', 'Los Boliches', st_setsrid(st_makepoint(-4.615,36.551),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('5124e211-ded9-41df-8925-dd9afda5b70e', 'family-park-los-boliches', 'Family Park Los Boliches', 'A great place for kids and families to spend the day in Los Boliches.', 'A great place for kids and families to spend the day in Los Boliches.', 'Centro de Los Boliches', (select id from cities where slug='boliches'), 'published', true, st_setsrid(st_makepoint(-4.612522664017695,36.551015440294634),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('c372c974-ccef-416b-b9b6-524370024eb9', '5124e211-ded9-41df-8925-dd9afda5b70e', '20000000-0000-4000-8000-000000000005', 'family-park-los-boliches-event', 'Special Event at Family Park Los Boliches', 'Special Event at Family Park Los Boliches', 'A great place for kids and families to spend the day in Los Boliches.', 'A great place for kids and families to spend the day in Los Boliches.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('df3f6970-2fb3-4eee-858c-17219d2b5620', 'c372c974-ccef-416b-b9b6-524370024eb9', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('87dd8376-c8b1-4e18-8a72-302415a2ad38', 'c372c974-ccef-416b-b9b6-524370024eb9', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('d0a6628f-7be1-4cec-90b2-8ca191716488', 'el-asador-de-los-boliches', 'El Asador de Los Boliches', 'The best local traditional food in Los Boliches, highly rated on TripAdvisor.', 'The best local traditional food in Los Boliches, highly rated on TripAdvisor.', 'Centro de Los Boliches', (select id from cities where slug='boliches'), 'published', true, st_setsrid(st_makepoint(-4.613074356540407,36.55217221639049),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('d3a6ffa6-62f3-4679-8df6-3e1a3b045dbb', 'd0a6628f-7be1-4cec-90b2-8ca191716488', '20000000-0000-4000-8000-000000000004', 'el-asador-de-los-boliches-event', 'Special Event at El Asador de Los Boliches', 'Special Event at El Asador de Los Boliches', 'The best local traditional food in Los Boliches, highly rated on TripAdvisor.', 'The best local traditional food in Los Boliches, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('de3c62ca-372f-4abc-873f-b3f191b7a6a4', 'd3a6ffa6-62f3-4679-8df6-3e1a3b045dbb', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('2b4f8801-9b56-4a5f-ad7d-96341864dfba', 'd3a6ffa6-62f3-4679-8df6-3e1a3b045dbb', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('dc8e1784-0733-4cd0-89d6-544c08c2b2c4', 'club-social-los-boliches', 'Club Social Los Boliches', 'A popular meeting point and nightlife spot in Los Boliches.', 'A popular meeting point and nightlife spot in Los Boliches.', 'Centro de Los Boliches', (select id from cities where slug='boliches'), 'published', true, st_setsrid(st_makepoint(-4.61620748686295,36.55142795109442),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('ac0edc9f-f292-4e7f-9926-591ef2b56feb', 'dc8e1784-0733-4cd0-89d6-544c08c2b2c4', '20000000-0000-4000-8000-000000000002', 'club-social-los-boliches-event', 'Special Event at Club Social Los Boliches', 'Special Event at Club Social Los Boliches', 'A popular meeting point and nightlife spot in Los Boliches.', 'A popular meeting point and nightlife spot in Los Boliches.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('01672e13-7f0b-46e9-9c14-629b3da5b324', 'ac0edc9f-f292-4e7f-9926-591ef2b56feb', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('bc759b09-6a2d-4320-bd97-3c122b4a6b1c', 'ac0edc9f-f292-4e7f-9926-591ef2b56feb', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Madrid
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('2af0506d-c965-4ae6-8b19-c96675595cfe', 'madrid', 'Madrid', 'Madrid', st_setsrid(st_makepoint(-3.7038,40.4168),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('33a6f14c-e270-422b-afeb-70a4f1d6e491', 'club-social-madrid', 'Club Social Madrid', 'A popular meeting point and nightlife spot in Madrid.', 'A popular meeting point and nightlife spot in Madrid.', 'Centro de Madrid', (select id from cities where slug='madrid'), 'published', true, st_setsrid(st_makepoint(-3.7020118274627536,40.41510245017731),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('34a9189a-87ec-43b4-b5f3-ff6c194a587c', '33a6f14c-e270-422b-afeb-70a4f1d6e491', '20000000-0000-4000-8000-000000000002', 'club-social-madrid-event', 'Special Event at Club Social Madrid', 'Special Event at Club Social Madrid', 'A popular meeting point and nightlife spot in Madrid.', 'A popular meeting point and nightlife spot in Madrid.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('3a3267a0-1cc5-427d-97c0-c14237b27a32', '34a9189a-87ec-43b4-b5f3-ff6c194a587c', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('9c1f04c4-cbb5-4e19-af60-93597c11079c', '34a9189a-87ec-43b4-b5f3-ff6c194a587c', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('4b33e11a-eab8-47af-a2e9-74ca313d2e84', 'live-room-madrid', 'Live Room Madrid', 'Top live music venue in the heart of Madrid.', 'Top live music venue in the heart of Madrid.', 'Centro de Madrid', (select id from cities where slug='madrid'), 'published', true, st_setsrid(st_makepoint(-3.702461567939356,40.416797253746886),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('e4b706fd-e8f0-4977-b225-f1c981d9eeef', '4b33e11a-eab8-47af-a2e9-74ca313d2e84', '20000000-0000-4000-8000-000000000001', 'live-room-madrid-event', 'Special Event at Live Room Madrid', 'Special Event at Live Room Madrid', 'Top live music venue in the heart of Madrid.', 'Top live music venue in the heart of Madrid.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('40905462-f18f-4bd0-a1de-e262fbd9242f', 'e4b706fd-e8f0-4977-b225-f1c981d9eeef', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('a7d9ca5b-fc48-41af-87ce-1780bde58b77', 'e4b706fd-e8f0-4977-b225-f1c981d9eeef', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('b24e6074-d5b0-4542-b67b-ad67fed68805', 'el-asador-de-madrid', 'El Asador de Madrid', 'The best local traditional food in Madrid, highly rated on TripAdvisor.', 'The best local traditional food in Madrid, highly rated on TripAdvisor.', 'Centro de Madrid', (select id from cities where slug='madrid'), 'published', true, st_setsrid(st_makepoint(-3.703533079333011,40.418531365555886),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('1f6defda-0a24-4eb8-b4c5-cc27e9d84f24', 'b24e6074-d5b0-4542-b67b-ad67fed68805', '20000000-0000-4000-8000-000000000004', 'el-asador-de-madrid-event', 'Special Event at El Asador de Madrid', 'Special Event at El Asador de Madrid', 'The best local traditional food in Madrid, highly rated on TripAdvisor.', 'The best local traditional food in Madrid, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('358780d0-8598-45ac-bcec-686414c69955', '1f6defda-0a24-4eb8-b4c5-cc27e9d84f24', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('c24cb1a7-4f3b-4293-9585-055370b70eee', '1f6defda-0a24-4eb8-b4c5-cc27e9d84f24', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Palma
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('09bac314-f654-4fab-b479-0d1ee7099433', 'palma', 'Palma', 'Palma', st_setsrid(st_makepoint(2.6502,39.5696),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('b3a21890-3d3d-47f7-944a-5164a2918124', 'live-room-palma', 'Live Room Palma', 'Top live music venue in the heart of Palma.', 'Top live music venue in the heart of Palma.', 'Centro de Palma', (select id from cities where slug='palma'), 'published', true, st_setsrid(st_makepoint(2.6478139920222645,39.5691458699709),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('cd83e268-eec0-46a4-8f7b-1461999e9b3a', 'b3a21890-3d3d-47f7-944a-5164a2918124', '20000000-0000-4000-8000-000000000001', 'live-room-palma-event', 'Special Event at Live Room Palma', 'Special Event at Live Room Palma', 'Top live music venue in the heart of Palma.', 'Top live music venue in the heart of Palma.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('18224030-587b-4d99-8e8c-819ae9f56437', 'cd83e268-eec0-46a4-8f7b-1461999e9b3a', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('820236f3-d8c2-4308-af03-01d9cab540d3', 'cd83e268-eec0-46a4-8f7b-1461999e9b3a', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('19c9ac5d-0f6c-4fa1-b282-dbf0db9b11bb', 'club-social-palma', 'Club Social Palma', 'A popular meeting point and nightlife spot in Palma.', 'A popular meeting point and nightlife spot in Palma.', 'Centro de Palma', (select id from cities where slug='palma'), 'published', true, st_setsrid(st_makepoint(2.6507946808274796,39.56845088572341),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('a294c977-7e80-4d92-9b07-48084a8d2776', '19c9ac5d-0f6c-4fa1-b282-dbf0db9b11bb', '20000000-0000-4000-8000-000000000002', 'club-social-palma-event', 'Special Event at Club Social Palma', 'Special Event at Club Social Palma', 'A popular meeting point and nightlife spot in Palma.', 'A popular meeting point and nightlife spot in Palma.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('6fef6e25-30c3-4785-97d7-ffa2c66a5e8f', 'a294c977-7e80-4d92-9b07-48084a8d2776', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('964829d5-049f-4d82-a595-af97652e192e', 'a294c977-7e80-4d92-9b07-48084a8d2776', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('b206c960-862a-4933-9baa-645f43cab29e', 'active-center-palma', 'Active Center Palma', 'Sports and fitness events happening all week.', 'Sports and fitness events happening all week.', 'Centro de Palma', (select id from cities where slug='palma'), 'published', true, st_setsrid(st_makepoint(2.6498596305253,39.56817687170729),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('056128da-8b8b-48b0-8c27-8dbf8ae290d5', 'b206c960-862a-4933-9baa-645f43cab29e', '20000000-0000-4000-8000-000000000006', 'active-center-palma-event', 'Special Event at Active Center Palma', 'Special Event at Active Center Palma', 'Sports and fitness events happening all week.', 'Sports and fitness events happening all week.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('c40c0a85-be1f-4066-a005-2ddbf1f68954', '056128da-8b8b-48b0-8c27-8dbf8ae290d5', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('5588945e-bd12-4cfc-9e68-7a467d2affb2', '056128da-8b8b-48b0-8c27-8dbf8ae290d5', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: Sevilla
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('0f7dd148-b956-4f8b-b44f-ee244c2e35b1', 'sevilla', 'Sevilla', 'Sevilla', st_setsrid(st_makepoint(-5.9845,37.3891),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('2622a94a-a966-458c-9a2b-789a76620110', 'live-room-sevilla', 'Live Room Sevilla', 'Top live music venue in the heart of Sevilla.', 'Top live music venue in the heart of Sevilla.', 'Centro de Sevilla', (select id from cities where slug='sevilla'), 'published', true, st_setsrid(st_makepoint(-5.986611823070854,37.389976328920554),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('8e060792-e789-4b1e-b7ea-b213f556d2eb', '2622a94a-a966-458c-9a2b-789a76620110', '20000000-0000-4000-8000-000000000001', 'live-room-sevilla-event', 'Special Event at Live Room Sevilla', 'Special Event at Live Room Sevilla', 'Top live music venue in the heart of Sevilla.', 'Top live music venue in the heart of Sevilla.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('614b2b74-5890-4f17-b021-04e0b4252a12', '8e060792-e789-4b1e-b7ea-b213f556d2eb', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('f06e479e-a2e3-43e6-a379-2d32e609064d', '8e060792-e789-4b1e-b7ea-b213f556d2eb', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('1c0a2926-41df-4202-b354-362682fb8934', 'el-asador-de-sevilla', 'El Asador de Sevilla', 'The best local traditional food in Sevilla, highly rated on TripAdvisor.', 'The best local traditional food in Sevilla, highly rated on TripAdvisor.', 'Centro de Sevilla', (select id from cities where slug='sevilla'), 'published', true, st_setsrid(st_makepoint(-5.983726967048216,37.38974223714144),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('d1cc31a3-84bc-4799-80f3-347ff5123e95', '1c0a2926-41df-4202-b354-362682fb8934', '20000000-0000-4000-8000-000000000004', 'el-asador-de-sevilla-event', 'Special Event at El Asador de Sevilla', 'Special Event at El Asador de Sevilla', 'The best local traditional food in Sevilla, highly rated on TripAdvisor.', 'The best local traditional food in Sevilla, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('082b6fe4-91b3-4d4d-8c1f-a4764c3716c6', 'd1cc31a3-84bc-4799-80f3-347ff5123e95', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('e4786001-9587-4753-8ea1-b045f350df7f', 'd1cc31a3-84bc-4799-80f3-347ff5123e95', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('c62b5ceb-3949-417e-b9a1-cf732412842b', 'creative-space-sevilla', 'Creative Space Sevilla', 'Workshops and creative classes for all ages.', 'Workshops and creative classes for all ages.', 'Centro de Sevilla', (select id from cities where slug='sevilla'), 'published', true, st_setsrid(st_makepoint(-5.984986539276866,37.38806983760457),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('5fe60744-625e-4e3c-be9e-489f20e02746', 'c62b5ceb-3949-417e-b9a1-cf732412842b', '20000000-0000-4000-8000-000000000003', 'creative-space-sevilla-event', 'Special Event at Creative Space Sevilla', 'Special Event at Creative Space Sevilla', 'Workshops and creative classes for all ages.', 'Workshops and creative classes for all ages.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('be9a321d-4c95-4622-ab07-4557b334e43b', '5fe60744-625e-4e3c-be9e-489f20e02746', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('18fe6cb6-cda9-401b-a908-4f018ef4e459', '5fe60744-625e-4e3c-be9e-489f20e02746', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

-- Locality: València
insert into cities(id,slug,name_es,name_en,center,timezone)
values ('436f267a-2d67-4b60-913b-ec3aaf7cf2d8', 'valencia', 'València', 'València', st_setsrid(st_makepoint(-0.3763,39.4699),4326)::geography, 'Europe/Madrid')
on conflict(slug) do update set name_es=excluded.name_es, center=excluded.center;

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('64af2c7e-bc8b-4e6f-8daf-30d65faa70f0', 'family-park-val-ncia', 'Family Park València', 'A great place for kids and families to spend the day in València.', 'A great place for kids and families to spend the day in València.', 'Centro de València', (select id from cities where slug='valencia'), 'published', true, st_setsrid(st_makepoint(-0.3764725921489847,39.46982765802916),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('0e962888-9f03-4598-9286-9bb827745c52', '64af2c7e-bc8b-4e6f-8daf-30d65faa70f0', '20000000-0000-4000-8000-000000000005', 'family-park-val-ncia-event', 'Special Event at Family Park València', 'Special Event at Family Park València', 'A great place for kids and families to spend the day in València.', 'A great place for kids and families to spend the day in València.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('0351719f-3e19-4894-ab5d-8b75a8f7849f', '0e962888-9f03-4598-9286-9bb827745c52', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('00355135-882d-43ed-80a4-7d85ad78af99', '0e962888-9f03-4598-9286-9bb827745c52', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('4a3c871f-f9ea-4113-a593-d6cd0884e6f6', 'el-asador-de-val-ncia', 'El Asador de València', 'The best local traditional food in València, highly rated on TripAdvisor.', 'The best local traditional food in València, highly rated on TripAdvisor.', 'Centro de València', (select id from cities where slug='valencia'), 'published', true, st_setsrid(st_makepoint(-0.3781815856267558,39.468930221265815),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('16f6d087-66fc-4cf5-afb6-cd75fccb9555', '4a3c871f-f9ea-4113-a593-d6cd0884e6f6', '20000000-0000-4000-8000-000000000004', 'el-asador-de-val-ncia-event', 'Special Event at El Asador de València', 'Special Event at El Asador de València', 'The best local traditional food in València, highly rated on TripAdvisor.', 'The best local traditional food in València, highly rated on TripAdvisor.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('9489265f-9a01-4c99-a389-098d35b81428', '16f6d087-66fc-4cf5-afb6-cd75fccb9555', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('c7797ccc-d1e0-4cac-859c-b923271e20f0', '16f6d087-66fc-4cf5-afb6-cd75fccb9555', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

insert into venues(id, slug, name, description_es, description_en, address, city_id, status, verified, location, accessibility)
values ('98960822-b6b6-4fe8-8700-f8e5b4778ce2', 'club-social-val-ncia', 'Club Social València', 'A popular meeting point and nightlife spot in València.', 'A popular meeting point and nightlife spot in València.', 'Centro de València', (select id from cities where slug='valencia'), 'published', true, st_setsrid(st_makepoint(-0.37859703047633886,39.46894931433181),4326)::geography, '{"step_free": true}'::jsonb);

insert into events(id, venue_id, category_id, slug, title_es, title_en, description_es, description_en, status, price_cents, currency, source)
values ('50c1bb0f-477d-429c-8a58-25e7e7e60c5e', '98960822-b6b6-4fe8-8700-f8e5b4778ce2', '20000000-0000-4000-8000-000000000002', 'club-social-val-ncia-event', 'Special Event at Club Social València', 'Special Event at Club Social València', 'A popular meeting point and nightlife spot in València.', 'A popular meeting point and nightlife spot in València.', 'published', 0, 'EUR', 'verified_venue');

insert into event_occurrences(id, event_id, starts_at, ends_at, status)
values 
  ('2530a566-72c3-4b22-9675-9744e28bbcb1', '50c1bb0f-477d-429c-8a58-25e7e7e60c5e', '2026-08-07T18:00:00.000Z', '2026-08-07T22:00:00.000Z', 'scheduled'),
  ('061d8b18-069f-4edf-ab80-ab8574f576a0', '50c1bb0f-477d-429c-8a58-25e7e7e60c5e', '2026-08-10T18:00:00.000Z', '2026-08-10T22:00:00.000Z', 'scheduled');

commit;
