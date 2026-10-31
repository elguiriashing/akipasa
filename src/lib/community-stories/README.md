# City Stories backend foundation

This source is not an applied migration or a verified live service. Deploy only
with the reviewed canonical schema and the private `community-stories` bucket.
The application returns unavailable when the RPC/storage configuration is absent.
API access requires `AKIPASA_COMMUNITY_STORIES_SCHEMA_READY=true`, which must also
keep account export enabled after collection is disabled. SQL collection defaults
off independently in private `community_story_settings`; enable it only after the
installed schema, private storage and complete account export are verified.

A story requires explicit public consent and the current eligible account's
accepted, credential-backed venue check-in within the previous 24 hours. The
server derives the published verified venue and canonical city. Photographs,
selfie labels, client coordinates and browser capture do not prove attendance.
There are no XP awards, AI calls, notification calls or paid provider operations.
Authenticated owners retain their own listing, withdrawal, aborted-upload cleanup
and deletion cleanup rights if attendance/onboarding eligibility is later revoked.
New submissions, eligible-check-in discovery, reporting and moderation still require
the canonical eligibility guard. All ownership checks remain server-side.

Public access expires 24 hours after reservation. **Access expiry does not mean
physical deletion of the stored image.** Owner deletion and moderation removal
revoke feed/media access transactionally before attempting bucket deletion.
`mediaCleanup: removed` means storage acknowledged removal and its object metadata
is absent; it is not a claim about backup erasure. `pending` explicitly means
cleanup remains outstanding. Failed/aborted uploads retain their attempt for the
daily cap and create a private `community_story_media_cleanup` backlog. Repeating
owner DELETE retries cleanup. An operational retention/cleanup runner and its
verification must be provided before making stronger physical-retention promises;
none is silently scheduled by this source. Identity/check-in deletion cascades
story/report metadata and queues its opaque image ID before removal; the private
cleanup backlog survives without a deleted identity reference. Nullable moderator
references and report cascades avoid blocking existing account-deletion journeys.

The authenticated `export` RPC action supports `stories`, `reports` and `cleanup`
sections, including the owner's retained expired/deleted rows. Each page is capped
at 100 with stable UUID keyset pagination and explicit `truncated`/`nextCursor`.
Export does not include other owners, moderator identities or a storage URL.

All photos start pending manual moderation. Only the existing canonical eligible
moderator/administrator guard permits review and approval. Approval additionally
requires the private storage object to exist. Public/owner/staff media scope is
checked by RPC on every request; responses are no-store WebP with nosniff. No
storage key, profile ID, precise visitor location or private report detail appears
in public projections. Restrictive storage RLS prevents legacy permissive policies
from granting clients direct access to this bucket.

The browser flattens/reencodes its decoded image, then canonicalizes only its own
encoded output. The server independently accepts a single static opaque VP8/VP8L
WebP chunk, strict RIFF length/padding, <=5 MiB, <=4096 pixels per side and <=16 MP.
Metadata, extended/alpha/animation/unknown chunks are rejected. Structural parsing
is not full entropy decoding or a guarantee that the depicted place/person is real.

Feeds return at most 50 recent stories and no continuation cursor. City discovery
returns at most 200 canonical city centroids and actual live approved story counts.
Precise visitor geolocation is calculated locally by the viewer and never sent to
these endpoints. Counts describe submitted approved stories, not crowd levels.

Tests use disposable authentication/storage/PostGIS-centroid adapters and PGlite.
They do not establish live Supabase Auth, installed policy/catalog equivalence,
complete historical migration replay, physical-device acceptance or live deletion.
