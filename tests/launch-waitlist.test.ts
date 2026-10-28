import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  boundedJson,
  digestToken,
  launchWaitlistSchema,
  rateDigest,
  verificationMessage,
  verificationToken,
  verifyTurnstile,
  waitlistCorsHeaders,
  waitlistOriginProduct,
} from "../src/lib/launch-waitlist";

const valid = {
  product: "duermo",
  fullName: "Alex Example",
  email: "ALEX@EXAMPLE.COM",
  city: "Fuengirola",
  audience: "person",
  interests: "Seaside stays",
  locale: "en",
  launchConsent: true,
  marketingConsent: false,
  turnstileToken: "turnstile-example",
};

describe("launch waitlist contract", () => {
  it("allows only the actual consumer product origins", () => {
    expect(waitlistOriginProduct("https://akiduermo.com")).toBe("duermo");
    expect(waitlistOriginProduct("https://www.akicoches.com")).toBe("coches");
    for (const origin of [
      null,
      "https://akihq.app",
      "https://akiduermo.com.evil.example",
      "http://akiduermo.com",
      "https://akipasa.com",
    ]) {
      expect(waitlistOriginProduct(origin)).toBeNull();
      expect(waitlistCorsHeaders(origin)).not.toHaveProperty(
        "Access-Control-Allow-Origin",
      );
    }
    expect(
      waitlistCorsHeaders("https://akicoches.com"),
    ).toHaveProperty("Access-Control-Allow-Origin", "https://akicoches.com");
  });

  it("requires explicit launch consent, separate optional marketing and validates fields", () => {
    const parsed = launchWaitlistSchema.parse(valid);
    expect(parsed.email).toBe("alex@example.com");
    expect(parsed.marketingConsent).toBe(false);
    for (const value of [
      { ...valid, launchConsent: false },
      { ...valid, email: "broken" },
      { ...valid, audience: "admin" },
      { ...valid, city: "" },
      { ...valid, turnstileToken: "" },
      { ...valid, unexpected: "ignored?" },
    ]) {
      expect(launchWaitlistSchema.safeParse(value).success).toBe(false);
    }
  });

  it("caps bodies even when the client omits Content-Length", async () => {
    const small = new Request("https://akipasa.com/api/launch-waitlist", {
      method: "POST",
      body: JSON.stringify(valid),
    });
    expect(await boundedJson(small)).toEqual(valid);
    const large = new Request("https://akipasa.com/api/launch-waitlist", {
      method: "POST",
      body: JSON.stringify({ padding: "x".repeat(5000) }),
    });
    await expect(boundedJson(large)).rejects.toThrow("body_too_large");
  });

  it("requires a successful, same-host, exact-action Turnstile proof", async () => {
    const respond = (hostname: string, action: string, success = true) =>
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ hostname, action, success }),
      );
    expect(
      await verifyTurnstile(
        "token",
        "secret",
        "https://akiduermo.com",
        respond("akiduermo.com", "launch_waitlist"),
      ),
    ).toBe(true);
    expect(
      await verifyTurnstile(
        "token",
        "secret",
        "https://akiduermo.com",
        respond("akicoches.com", "launch_waitlist"),
      ),
    ).toBe(false);
    expect(
      await verifyTurnstile(
        "token",
        "secret",
        "https://akiduermo.com",
        respond("akiduermo.com", "login"),
      ),
    ).toBe(false);
  });

  it("uses random one-time tokens, fixed hashes and purpose-separated limit keys", () => {
    const a = verificationToken();
    const b = verificationToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(digestToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(digestToken(a)).not.toBe(a);
    expect(rateDigest("secret", "email", "same")).not.toBe(
      rateDigest("secret", "ip", "same"),
    );
  });

  it("renders bilingual opt-in email without tracking links or auto-confirm", () => {
    for (const locale of ["es", "en"] as const) {
      const mail = verificationMessage({
        entryId: "00000000-0000-4000-8000-000000000001",
        product: "coches",
        locale,
        token: "a".repeat(64),
      });
      expect(mail.text).toContain("/waitlist/confirm?");
      expect(mail.text).toContain("support@akipasa.com");
      expect(mail.text).toContain("/" + locale + "/privacy");
      expect(mail.text).not.toContain("unsubscribe?email=");
      expect(mail.subject).toContain("AkiCoches");
    }
  });

  it("keeps subscriber records private and rate-limit RPCs service-only", () => {
    const sql = readFileSync(
      "supabase/migrations/20261028022000_launch_waitlist.sql",
      "utf8",
    );
    expect(sql).toContain(
      "alter table public.launch_waitlist_entries enable row level security",
    );
    expect(sql).toContain(
      "revoke all on public.launch_waitlist_entries from public, anon, authenticated",
    );
    expect(sql).toContain(
      "grant select, insert, update, delete on public.launch_waitlist_entries to service_role",
    );
    expect(sql).toContain("security definer set search_path = ''");
    expect(sql).toContain("p_window_seconds");
    expect(sql).toContain("verified_at is null");
    expect(sql).toContain("interval '24 hours'");
    expect(sql).toContain("interval '30 days'");
  });
});
