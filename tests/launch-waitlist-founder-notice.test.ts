import { describe, expect, it, vi } from "vitest";
import {
  founderWaitlistEmail,
  sendFounderWaitlistNotice,
  type ConfirmedWaitlistEntry,
} from "../src/lib/launch-waitlist-founder-notice";

const verified: ConfirmedWaitlistEntry = {
  id: "00000000-0000-4000-8000-000000000001",
  product: "coches",
  full_name: "Example <Person>",
  email: "person@example.com",
  city: "Fuengirola",
  audience: "business",
  interests: "Rental fleet & cars",
  locale: "es",
  verified_at: "2026-10-28T21:00:00.000Z",
  marketing_consent_at: null,
};

describe("founder notifications for verified waitlist entries", () => {
  it("formats safe HTML and includes separate marketing consent", () => {
    const content = founderWaitlistEmail(verified);
    expect(content.subject).toContain("AkiCoches");
    expect(content.html).toContain("Example &lt;Person&gt;");
    expect(content.html).not.toContain("Example <Person>");
    expect(content.html).toContain("Fuengirola");
    expect(content.html).toContain("No");
    expect(content.text).toContain("AkiCoches");
  });

  it("sends one operational email to both founders with stable idempotency", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "queued-test" }, { status: 200 }));
    expect(
      await sendFounderWaitlistNotice(verified, "test-resend-key", fetcher),
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("launch-founders-" + verified.id);
    const payload = JSON.parse(String(init?.body));
    expect(payload.to).toEqual(["alex@akipasa.com", "andrew@akipasa.com"]);
    expect(payload.subject).toContain("AkiCoches");
    expect(payload.html).toContain("New verified signup");
  });

  it("reports rejection without issuing additional sends", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ message: "unavailable" }, { status: 503 }),
      );
    expect(
      await sendFounderWaitlistNotice(verified, "test-resend-key", fetcher),
    ).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
