-- Accelerate the correlated duplicate-survivor lookup used by
-- public_nearby_venue_page without changing any venue records or ranking.
-- The existing GiST(location) index remains responsible for the 80m filter.
create index if not exists venues_published_activities_normalized_name_idx
on public.venues (public.venue_search_normalize(name))
where status = 'published' and discovery_vertical = 'activities'
  and map_location_suspect = false;
