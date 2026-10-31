import { pathToFileURL } from "node:url";

/** Configuration isolation only; this does not verify staging fixtures or access. */
export function validateBookingStaging(env = process.env) {
  const fail = (field, requirement) => {
    throw new Error(`${field}: ${requirement}`);
  };
  const required = (field) => {
    const value = env[field];
    if (typeof value !== "string" || !value.trim())
      fail(field, "must be nonempty");
    return value;
  };
  if (env.NEXT_PUBLIC_DATA_PROVIDER !== "supabase")
    fail("NEXT_PUBLIC_DATA_PROVIDER", "must equal supabase");
  const ref = required("BOOKING_STAGING_PROJECT_REF");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(ref))
    fail("BOOKING_STAGING_PROJECT_REF", "must be a single lowercase DNS label");
  if (["vhpbvcfkcteswlsdjrfl", "akipasa"].includes(ref))
    fail(
      "BOOKING_STAGING_PROJECT_REF",
      "must identify a non-production project",
    );
  const raw = required("NEXT_PUBLIC_SUPABASE_URL");
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL", "must be the exact staging HTTPS origin");
  }
  const origin = `https://${ref}.supabase.co`;
  if (raw !== origin || url.origin !== origin)
    fail(
      "NEXT_PUBLIC_SUPABASE_URL",
      "must equal the HTTPS origin for BOOKING_STAGING_PROJECT_REF without credentials, path, query, fragment or port",
    );
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  required("AKIPASA_QA_EMAIL");
  required("AKIPASA_QA_PASSWORD");
  const venue = required("AKIPASA_QA_VENUE_ID");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      venue,
    )
  )
    fail("AKIPASA_QA_VENUE_ID", "must be a UUID");
  return Object.freeze({ origin, projectRef: ref });
}

export function runBookingStagingValidation(
  env = process.env,
  output = console,
) {
  try {
    const { origin, projectRef } = validateBookingStaging(env);
    output.log(
      `Booking staging configuration validated: ${origin} (${projectRef}).`,
    );
    return 0;
  } catch (error) {
    output.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = runBookingStagingValidation();
