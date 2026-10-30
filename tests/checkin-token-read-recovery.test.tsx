// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  rpc: vi.fn(),
  read: vi.fn(),
  flags: vi.fn(),
  uuid: vi.fn(() => "fixture-idempotency-key"),
  form: vi.fn(),
  notFound: vi.fn((): never => {
    throw new Error("not-found");
  }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    default: { ...actual, randomUUID: mocks.uuid },
    randomUUID: mocks.uuid,
  };
});
vi.mock("@/lib/auth", () => ({ requireUser: mocks.client }));
vi.mock("@/lib/feature-flags", () => ({ loadFeatureFlags: mocks.flags }));
vi.mock("../src/app/[locale]/check-in/[token]/CheckInForm", () => ({
  CheckInForm: (props: unknown) => {
    mocks.form(props);
    return <div data-testid="checkin-form" />;
  },
}));
import CheckInPage from "../src/app/[locale]/check-in/[token]/page";
const token = "91000000-0000-4000-8000-000000000001";
const credential = {
  venue_id: "private-venue-id",
  venue_name: "Private fixture venue",
};
const chain = { maybeSingle: mocks.read };
const page = (locale: string, value = token) =>
  CheckInPage({ params: Promise.resolve({ locale, token: value }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({ supabase: { rpc: mocks.rpc } });
  mocks.rpc.mockReturnValue(chain);
  mocks.flags.mockResolvedValue({ loyalty_check_ins: true });
  mocks.read.mockResolvedValue({ data: credential, error: null });
});
afterEach(cleanup);
for (const locale of ["en", "es"])
  describe(`token read recovery ${locale}`, () => {
    for (const stale of [false, true])
      it(`handles actual error without leaking stale data (${stale})`, async () => {
        mocks.read.mockResolvedValue({
          data: stale ? credential : null,
          error: { message: "PRIVATE DATABASE DIAGNOSTIC", code: "42501" },
        });
        render(await page(locale));
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          locale === "es"
            ? "No se puede cargar el check-in"
            : "Check-in unavailable",
        );
        expect(
          screen.getByRole("link", {
            name: locale === "es" ? "Reintentar" : "Retry",
          }),
        ).toHaveAttribute("href", `/${locale}/check-in/${token}`);
        expect(document.body).not.toHaveTextContent("Private fixture venue");
        expect(document.body).not.toHaveTextContent(
          "PRIVATE DATABASE DIAGNOSTIC",
        );
        expect(document.body).not.toHaveTextContent(token);
        expect(mocks.form).not.toHaveBeenCalled();
        expect(mocks.uuid).not.toHaveBeenCalled();
        expect(mocks.notFound).not.toHaveBeenCalled();
      });
    it("retains missing or RLS-hidden credential 404", async () => {
      mocks.read.mockResolvedValue({ data: null, error: null });
      await expect(page(locale)).rejects.toThrow("not-found");
      expect(mocks.form).not.toHaveBeenCalled();
      expect(mocks.uuid).not.toHaveBeenCalled();
    });
    it("retains hidden joined venue 404", async () => {
      mocks.read.mockResolvedValue({
        data: { ...credential, venue_name: null },
        error: null,
      });
      await expect(page(locale)).rejects.toThrow("not-found");
      expect(mocks.uuid).not.toHaveBeenCalled();
    });
    it("preserves successful active credential form and query scope", async () => {
      render(await page(locale));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        credential.venue_name,
      );
      expect(mocks.client).toHaveBeenCalledWith(
        locale,
        `/${locale}/check-in/${token}`,
      );
      expect(mocks.rpc).toHaveBeenCalledWith("checkin_venue_preview", {
        p_token: token,
      });
      expect(mocks.form).toHaveBeenCalledWith({
        locale,
        token,
        idempotencyKey: "fixture-idempotency-key",
      });
      expect(mocks.uuid).toHaveBeenCalledTimes(1);
    });
    it("keeps feature-disabled check-ins paused without form", async () => {
      mocks.flags.mockResolvedValue({ loyalty_check_ins: false });
      render(await page(locale));
      expect(document.body).toHaveTextContent(
        locale === "es"
          ? "No se ha registrado ninguna visita"
          : "No visit has been recorded",
      );
      expect(mocks.form).not.toHaveBeenCalled();
      expect(mocks.uuid).not.toHaveBeenCalled();
    });
    it("rejects malformed tokens before client creation", async () => {
      await expect(page(locale, "invalid-token")).rejects.toThrow("not-found");
      expect(mocks.client).not.toHaveBeenCalled();
    });
  });
it("rejects invalid locale before client creation", async () => {
  await expect(page("fr")).rejects.toThrow("not-found");
  expect(mocks.client).not.toHaveBeenCalled();
});
