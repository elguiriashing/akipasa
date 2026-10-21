-- Library retained-asset identities are safe only while legacy object overwrite is disabled.
begin;
alter table akisuite_listing_private.launch_settings add constraint listing_library_requires_verified_uploads check(not library_enabled or uploads_enforced);
notify pgrst,'reload schema';
commit;
