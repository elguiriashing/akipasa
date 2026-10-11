import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");
it("uses private, leased email deliveries without backfilling historical records", () => {
  const sql = source("supabase/migrations/20261011013000_suite_emails.sql");
  const mirror = source("database/migrations/20261011013000_suite_emails.sql");
  expect(sql).toBe(mirror);
  expect(sql).toContain("create table if not exists public.suite_email_outbox");
  expect(sql).toContain("dedupe_key text not null unique");
  expect(sql).toContain("grant execute on function public.claim_due_suite_emails()");
  expect(sql).toContain("to service_role;");
  expect(sql).toContain("revoke all on public.suite_email_outbox");
  expect(sql).toContain("for update of x skip locked");
  expect(sql).toContain("first_attempt_at < now()-interval '23 hours'");
  expect(sql).toContain("on conflict(dedupe_key) do nothing");
  expect(sql).not.toContain("insert into public.suite_email_outbox select * from public.profiles");
  expect(sql).not.toContain("insert into public.suite_email_outbox select * from public.booking_requests");
});

it("takes first-visit portal locale and deduplicates one welcome per user/product", () => {
  const sql = source("supabase/migrations/20261011013000_suite_emails.sql");
  expect(sql).toContain("'welcome:'||auth.uid()::text||':'||p_product");
  expect(sql).toContain("u.email_confirmed_at is null");
  expect(source("src/app/[locale]/layout.tsx")).toContain("queueSuitePortalWelcome");
  expect(source("src/app/akiduermo/account/page.tsx")).toContain('queueSuitePortalWelcome("akiduermo", locale)');
  expect(source("src/app/[locale]/business/actions.ts")).toContain("claim_locale: parsed.data.locale");
});

it("guards optional reminders with consent and authoritative saved-item and booking states", () => {
  const sql = source("supabase/migrations/20261011013000_suite_emails.sql");
  expect(sql).toContain("event_reminders boolean not null default false");
  expect(sql).toContain("stay_reminders boolean not null default false");
  expect(sql).toContain("join public.saved_event_refs s");
  expect(sql).toContain("join public.event_occurrences oc");
  expect(sql).toContain("s.saved_at<=now()-interval '5 days'");
  expect(sql).toContain("not exists (");
  expect(source("src/lib/suite-mail-delivery.ts")).toContain("reminders_opted_out");
  expect(source("src/lib/suite-mail-delivery.ts")).toContain("stay_unsaved_or_saved_again");
  expect(source("src/app/[locale]/account/saved/page.tsx")).toContain("setSavedEventReminder");
  expect(source("src/components/AkiDuermo.tsx")).toContain("setStayReminderPreference");
  expect(source("src/lib/akiduermo-routing.ts")).toContain('"/api/stays/saved"');
});

it("preserves existing confirmation hooks and offers new request/cancellation email triggers", () => {
  const sql = source("supabase/migrations/20261011013000_suite_emails.sql");
  expect(sql).toContain("after insert on public.booking_requests");
  expect(sql).toContain("after update of status on public.booking_requests");
  expect(sql).toContain("after insert on public.accommodation_reservations");
  expect(sql).toContain("after update of status on public.accommodation_reservations");
  expect(sql).not.toContain("drop trigger if exists booking_confirmed_queue");
  expect(sql).not.toContain("drop trigger if exists accommodation_confirmation_queue");
  expect(source("src/app/[locale]/events/[slug]/book/actions.ts")).toContain('rpc("request_booking_v2"');
  expect(source("src/lib/booking-confirmation-email.ts")).toContain("akiduermo.akipasa.com/bookings");
});

it("uses support as sender for claim, confirmation and suite email providers", () => {
  for (const path of [
    "src/lib/booking-confirmation-email.ts",
    "src/lib/claim-decision-email.ts",
    "src/lib/suite-email-templates.ts",
  ])
    expect(source(path)).toContain("support@akipasa.com");
  expect(source("src/lib/claim-submission-alert.ts")).toContain("suiteEmailFrom");
  expect(source("custom-worker.ts")).toContain("dispatchSuiteEmails(env)");
});
