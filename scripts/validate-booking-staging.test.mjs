import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  validateBookingStaging,
  runBookingStagingValidation,
} from "./validate-booking-staging.mjs";
import { publicUiFixtureAddress } from "../tests/fixtures/public-ui-supabase.mjs";

const good = {
  NEXT_PUBLIC_DATA_PROVIDER: "supabase",
  BOOKING_STAGING_PROJECT_REF: "disposable-qa-project",
  NEXT_PUBLIC_SUPABASE_URL: "https://disposable-qa-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-not-a-real-key",
  AKIPASA_QA_EMAIL: "fixture@example.invalid",
  AKIPASA_QA_PASSWORD: "fixture-password-not-real",
  AKIPASA_QA_VENUE_ID: "10000000-0000-4000-8000-000000000001",
};
test("accepts isolated exact origin and does not start the public fixture backend", () => {
  assert.deepEqual(validateBookingStaging(good), {
    origin: good.NEXT_PUBLIC_SUPABASE_URL,
    projectRef: good.BOOKING_STAGING_PROJECT_REF,
  });
  assert.equal(publicUiFixtureAddress(good), null);
  assert.throws(
    () =>
      publicUiFixtureAddress({
        ...good,
        NEXT_PUBLIC_DATA_PROVIDER: "fixtures",
      }),
    /only bind/,
  );
});
for (const [field, value] of [
  ["NEXT_PUBLIC_DATA_PROVIDER", "fixtures"],
  ["NEXT_PUBLIC_DATA_PROVIDER", "Supabase"],
  ["BOOKING_STAGING_PROJECT_REF", "vhpbvcfkcteswlsdjrfl"],
  ["BOOKING_STAGING_PROJECT_REF", "akipasa"],
  ["BOOKING_STAGING_PROJECT_REF", "UPPER"],
  ["BOOKING_STAGING_PROJECT_REF", "two.labels"],
  ["BOOKING_STAGING_PROJECT_REF", "-invalid"],
  ["BOOKING_STAGING_PROJECT_REF", "invalid-"],
  ["BOOKING_STAGING_PROJECT_REF", "a".repeat(64)],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://vhpbvcfkcteswlsdjrfl.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://akipasa.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://other-project.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_URL", "http://disposable-qa-project.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://disposable-qa-project.supabase.co/"],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://disposable-qa-project.supabase.co/path",
  ],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://disposable-qa-project.supabase.co?private=secret",
  ],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://disposable-qa-project.supabase.co#secret",
  ],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://private:secret@disposable-qa-project.supabase.co",
  ],
  ["NEXT_PUBLIC_SUPABASE_URL", "https://disposable-qa-project.supabase.co:443"],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://disposable-qa-project.supabase.co:8443",
  ],
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "https://disposable-qa-project.supabase.co.evil.invalid",
  ],
  ["NEXT_PUBLIC_SUPABASE_URL", " https://disposable-qa-project.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_URL", "not-a-url"],
  ["AKIPASA_QA_VENUE_ID", "not-a-uuid"],
])
  test(`rejects invalid ${field} configuration ${value.slice(0, 20)}`, () => {
    assert.throws(
      () => validateBookingStaging({ ...good, [field]: value }),
      (error) =>
        error.message.startsWith(`${field}:`) && !error.message.includes(value),
    );
  });
for (const field of Object.keys(good))
  for (const value of [undefined, "", " \t"])
    test(`requires ${field} (${String(value)})`, () => {
      assert.throws(
        () => validateBookingStaging({ ...good, [field]: value }),
        new RegExp(`^Error: ${field}:`),
      );
    });
test("returns only sanitized public origin/ref, never credentials", () => {
  const lines = [];
  const output = { log: (s) => lines.push(s), error: (s) => lines.push(s) };
  assert.equal(runBookingStagingValidation(good, output), 0);
  assert.equal(lines.length, 1);
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "AKIPASA_QA_PASSWORD",
    "AKIPASA_QA_EMAIL",
    "AKIPASA_QA_VENUE_ID",
  ])
    assert.ok(!lines[0].includes(good[key]));
  lines.length = 0;
  assert.equal(
    runBookingStagingValidation(
      {
        ...good,
        NEXT_PUBLIC_SUPABASE_URL: "https://private:secret@bad.invalid",
      },
      output,
    ),
    1,
  );
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith("NEXT_PUBLIC_SUPABASE_URL:"));
  assert.ok(!lines[0].includes("private:secret"));
});
test("actual CLI exits cleanly and fails closed without leaking configured secrets", () => {
  const script = new URL("./validate-booking-staging.mjs", import.meta.url);
  const ok = spawnSync(process.execPath, [script.pathname], {
    env: { ...process.env, ...good },
    encoding: "utf8",
  });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /Booking staging configuration validated/);
  assert.equal(ok.stderr, "");
  const bad = spawnSync(process.execPath, [script.pathname], {
    env: { ...process.env, ...good, NEXT_PUBLIC_DATA_PROVIDER: "fixtures" },
    encoding: "utf8",
  });
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, "");
  assert.match(bad.stderr, /NEXT_PUBLIC_DATA_PROVIDER:/);
  assert.ok(!bad.stderr.includes(good.AKIPASA_QA_PASSWORD));
});
