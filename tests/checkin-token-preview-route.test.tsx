// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  read: vi.fn(),
  privateTable: vi.fn(() => {
    throw new Error("The preview must not read credential tables directly");
  }),
  anonymousClient: vi.fn(() => {
    throw new Error("The preview must use the guarded caller client");
  }),
  flags: vi.fn(),
  uuid: vi.fn(() => "disposable-preview-idempotency"),
  form: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.anonymousClient,
}));
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: mocks.anonymousClient,
}));
vi.mock("@/lib/feature-flags", () => ({ loadFeatureFlags: mocks.flags }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    default: { ...actual, randomUUID: mocks.uuid },
    randomUUID: mocks.uuid,
  };
});
vi.mock("../src/app/[locale]/check-in/[token]/CheckInForm", () => ({
  CheckInForm: (props: unknown) => {
    mocks.form(props);
    return <div data-testid="checkin-form" />;
  },
}));
import CheckInPage from "../src/app/[locale]/check-in/[token]/page";

const token = "91000000-0000-4000-8000-000000000001";
const caller = { rpc: mocks.rpc, from: mocks.privateTable };
const page = (locale: string) =>
  CheckInPage({ params: Promise.resolve({ locale, token }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({
    user: { id: "disposable-authenticated-consumer" },
    supabase: caller,
  });
  mocks.flags.mockResolvedValue({ loyalty_check_ins: true });
  mocks.read.mockResolvedValue({
    data: { venue_id: "disposable-venue", venue_name: "Disposable venue" },
    error: null,
  });
  mocks.rpc.mockReturnValue({ maybeSingle: mocks.read });
});
afterEach(cleanup);

for (const locale of ["en", "es"])
  describe(`guarded check-in preview ${locale}`, () => {
    it("uses the canonical account guard and same-locale token return before any preview", async () => {
      const redirect = Object.assign(new Error("central-auth-redirect"), {
        destination: `/${locale}/auth?next=${encodeURIComponent(`/${locale}/check-in/${token}`)}`,
      });
      mocks.requireUser.mockRejectedValue(redirect);
      await expect(page(locale)).rejects.toBe(redirect);
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/check-in/${token}`,
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.flags).not.toHaveBeenCalled();
      expect(mocks.form).not.toHaveBeenCalled();
      expect(mocks.uuid).not.toHaveBeenCalled();
      expect(mocks.anonymousClient).not.toHaveBeenCalled();
      expect(mocks.privateTable).not.toHaveBeenCalled();
    });

    for (const code of ["42501", "PGRST202"])
      it(`fails closed when account eligibility or RPC readiness rejects preview (${code})`, async () => {
        mocks.read.mockResolvedValue({
          data: {
            venue_id: "private-stale-venue",
            venue_name: "PRIVATE STALE VENUE",
          },
          error: { code, message: "PRIVATE BACKEND DIAGNOSTIC" },
        });
        render(await page(locale));
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          locale === "es"
            ? "No se puede cargar el check-in"
            : "Check-in unavailable",
        );
        expect(document.body).not.toHaveTextContent("PRIVATE STALE VENUE");
        expect(document.body).not.toHaveTextContent(
          "PRIVATE BACKEND DIAGNOSTIC",
        );
        expect(mocks.form).not.toHaveBeenCalled();
        expect(mocks.uuid).not.toHaveBeenCalled();
        expect(mocks.notFound).not.toHaveBeenCalled();
        expect(mocks.privateTable).not.toHaveBeenCalled();
        expect(mocks.anonymousClient).not.toHaveBeenCalled();
      });

    it("renders from the minimal caller-scoped preview without querying private credentials", async () => {
      render(await page(locale));
      expect(mocks.rpc).toHaveBeenCalledWith("checkin_venue_preview", {
        p_token: token,
      });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
      expect(mocks.requireUser.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.rpc.mock.invocationCallOrder[0],
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Disposable venue",
      );
      expect(mocks.form).toHaveBeenCalledWith({
        locale,
        token,
        idempotencyKey: "disposable-preview-idempotency",
      });
      expect(mocks.privateTable).not.toHaveBeenCalled();
      expect(mocks.anonymousClient).not.toHaveBeenCalled();
    });
  });
