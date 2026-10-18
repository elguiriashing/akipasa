-- Fail-closed personal Premium launch switch.
-- Set to true ONLY after the verified city-population-weighted points job reaches
-- the approved threshold, source freshness passes, and the paid SKU is cleared.
-- No untrusted browser or public API may write this flag.
INSERT INTO public.feature_flags (key, enabled, label_en, label_es)
VALUES (
  'personal_premium_unlocked',
  false,
  'Personal Premium unlocked at adoption milestone',
  'Premium personal desbloqueado al alcanzar el objetivo de adopción'
)
ON CONFLICT (key) DO NOTHING;
