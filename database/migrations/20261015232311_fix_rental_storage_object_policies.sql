-- Qualify the Storage object path: an unqualified name in the company
-- subquery resolves to car_rental_companies.name and rejects normal uploads.
alter policy rental_objects_insert on storage.objects
with check (
  objects.bucket_id = 'rental-media'
  and exists (
    select 1 from public.car_rental_companies c
    where c.id::text = split_part(objects.name, '/', 1)
      and public.can_manage_rental_company(c.id)
  )
);

alter policy rental_objects_delete on storage.objects
using (
  objects.bucket_id = 'rental-media'
  and exists (
    select 1 from public.car_rental_companies c
    where c.id::text = split_part(objects.name, '/', 1)
      and public.can_manage_rental_company(c.id)
  )
);

-- Managers need to see their own uploaded objects even before media metadata
-- is saved, including cleanup after a failed metadata INSERT. Public and
-- unrelated users still see only explicitly selected, RLS-visible media.
alter policy rental_objects_read on storage.objects
using (
  (
    objects.bucket_id = 'rental-media'
    and (
      exists (
        select 1 from public.car_rental_companies c
        where c.id::text = split_part(objects.name, '/', 1)
          and public.can_manage_rental_company(c.id)
      )
      or exists (
        select 1 from public.car_rental_media m
        where m.storage_bucket = objects.bucket_id
          and m.storage_path = objects.name
      )
    )
  )
  or (
    objects.bucket_id = 'event-media'
    and exists (
      select 1 from public.car_rental_media m
      where m.storage_bucket = objects.bucket_id
        and m.storage_path = objects.name
    )
  )
);
