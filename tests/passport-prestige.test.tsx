// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PassportPrestigeCard } from "../src/components/PassportPrestigeCard";
import {
  prestigeEnabled,
  prestigeShareSvg,
} from "../src/lib/passport-prestige";
const { action, privacyAction } = vi.hoisted(() => ({
  action: vi.fn(),
  privacyAction: vi.fn(),
}));
vi.mock("../src/app/[locale]/passports/prestige/actions", () => ({
  prestigeMemberAction: action,
  prestigePrivacyAction: privacyAction,
}));
import { PrestigeControls } from "../src/app/[locale]/passports/prestige/PrestigeControls";
const award = {
  id: "10000000-0000-0000-0000-000000000001",
  programme_key: "cafe_master",
  public_id: "10000000-0000-0000-0000-000000000002",
  serial: 4,
  title_es: "Maestro del café",
  title_en: "Cafe master",
  public_alias: "Explorer",
  awarded_at: "2026-10-20T12:00:00Z",
  shared: false,
  hall_of_fame: false,
  revoked_at: null,
  physical_status: null,
};
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("prestige presentation and privacy", () => {
  it("defaults launch off and only accepts explicit activation", () => {
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "");
    expect(prestigeEnabled()).toBe(false);
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "1");
    expect(prestigeEnabled()).toBe(false);
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "true");
    expect(prestigeEnabled()).toBe(true);
  });
  for (const locale of ["en", "es"] as const)
    it(`renders verified certificate and voluntary privacy in ${locale}`, () => {
      render(
        <>
          <PassportPrestigeCard award={award} locale={locale} />
          <PrestigeControls locale={locale} award={award} physicalEligible />
        </>,
      );
      expect(
        screen.getByRole("heading", {
          name: locale === "es" ? "Maestro del café" : "Cafe master",
        }),
      ).toBeTruthy();
      const checks = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(checks).toHaveLength(2);
      expect(checks.every((c) => !c.checked)).toBe(true);
      expect(screen.queryByLabelText(/address|dirección/i)).toBeNull();
    });
  it("preserves privacy choice separately and reports server rejection without success", async () => {
    action.mockResolvedValue({ error: "Requirements not met" });
    render(<PrestigeControls locale="en" programmeKey="cafe_master" />);
    fireEvent.click(screen.getByRole("button", { name: "Verify and unlock" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        "Requirements not met",
      ),
    );
    expect(action).toHaveBeenCalledWith("en", {
      action: "claim",
      programme_key: "cafe_master",
    });
  });
  it("sends explicit opt-ins and alias only when Save privacy is clicked", async () => {
    action.mockResolvedValue({ success: true });
    render(<PrestigeControls locale="en" award={award} />);
    fireEvent.click(
      screen.getByLabelText("Enable public certificate and sharing card"),
    );
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save privacy" }));
    await waitFor(() =>
      expect(action).toHaveBeenCalledWith("en", {
        action: "visibility",
        award_id: award.id,
        public_alias: "Explorer",
        shared: true,
        hall_of_fame: false,
      }),
    );
  });
  it("escapes share-card SVG fields and has no network or executable markup", () => {
    const svg = prestigeShareSvg(
      {
        ...award,
        public_alias: '<script>alert("x")</script>',
        title_en: '<image href="https://evil.test">',
      },
      "en",
    );
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<image href=");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });
});

import { PassportPrestigeDownload } from "../src/components/PassportPrestigeDownload";
describe("social PNG download", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("renders an actual 1200 by 630 PNG locally and releases both temporary URLs", async () => {
    const urls = vi
        .fn()
        .mockReturnValueOnce("blob:source")
        .mockReturnValueOnce("blob:png"),
      release = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: urls, revokeObjectURL: release });
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    const draw = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => ({ drawImage: draw }) as unknown as CanvasRenderingContext2D,
    );
    const encode = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation(function (this: HTMLCanvasElement, callback, type) {
        expect(this.width).toBe(1200);
        expect(this.height).toBe(630);
        expect(type).toBe("image/png");
        callback(new Blob(["test PNG"], { type: "image/png" }));
      });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("akipasa-prestige.png");
      });
    const fetch = vi.fn().mockResolvedValue(
      new Response("<svg/>", {
        headers: { "content-type": "image/svg+xml" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<PassportPrestigeDownload locale="en" publicId={award.public_id} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Download PNG sharing card" }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      `/api/passports/prestige/${award.public_id}?lang=en`,
      { cache: "no-store", credentials: "same-origin" },
    );
    expect(draw).toHaveBeenCalledOnce();
    expect(encode).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledWith("blob:source");
    expect(release).toHaveBeenCalledWith("blob:png");
  });
  it("checks current sharing before download and preserves an honest failure state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    render(<PassportPrestigeDownload locale="es" publicId={award.public_id} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Descargar tarjeta PNG" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "siga compartido",
      ),
    );
  });
});

import { PassportPrestigeShipping } from "../src/components/PassportPrestigeShipping";
import { PassportPrestigePrivacy } from "../src/components/PassportPrestigePrivacy";
describe("shipping privacy and intake presentation", () => {
  it("does not collect addresses before approved intake and eligibility", () => {
    render(<PassportPrestigeShipping locale="en" awardId={award.id} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("submits minimal private shipping fields only through explicit Save", async () => {
    action.mockResolvedValue({ success: true });
    const { container } = render(
      <PassportPrestigeShipping
        locale="en"
        awardId={award.id}
        enabled
        reviewed
        status="ready"
      />,
    );
    fireEvent.change(screen.getByLabelText("Recipient"), {
      target: { value: "Test Recipient" },
    });
    fireEvent.change(screen.getByLabelText("Address", { exact: true }), {
      target: { value: "1 Test Road" },
    });
    fireEvent.change(screen.getByLabelText("Postal code"), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText("City", { exact: true }), {
      target: { value: "Test City" },
    });
    fireEvent.change(screen.getByLabelText("Country code (ES, GB…)"), {
      target: { value: "ES" },
    });
    expect(action).not.toHaveBeenCalled();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(action).toHaveBeenCalledWith("en", {
        action: "shipping_submit",
        award_id: award.id,
        recipient_name: "Test Recipient",
        address_line1: "1 Test Road",
        address_line2: "",
        postal_code: "12345",
        city: "Test City",
        region: "",
        country_code: "ES",
        phone: "",
      }),
    );
  });
  it("offers address deletion and public withdrawal independently of reward claims", async () => {
    privacyAction.mockResolvedValue({ success: true });
    render(
      <PassportPrestigePrivacy locale="es" awardId={award.id} address shared />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar dirección de envío" }),
    );
    await waitFor(() =>
      expect(privacyAction).toHaveBeenCalledWith("es", {
        action: "shipping_delete",
        award_id: award.id,
      }),
    );
    expect(action).not.toHaveBeenCalled();
  });
});
