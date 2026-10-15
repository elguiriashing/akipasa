import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ReviewPage from "../src/app/[locale]/staff/accommodations/page";
const mock = vi.hoisted(() => ({
  db: { from: vi.fn(), rpc: vi.fn() },
  require: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error("redirect:" + url);
  }),
  revalidate: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ requireUser: mock.require }));
vi.mock("next/navigation", () => ({
  redirect: mock.redirect,
  notFound: () => {
    throw new Error("not_found");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
import { reviewAccommodation } from "../src/app/[locale]/staff/accommodations/actions";
const property = "11111111-1111-4111-8111-111111111111",
  revision = "22222222-2222-4222-8222-222222222222";
function form(locale = "en") {
  const data = new FormData();
  Object.entries({
    locale,
    property,
    revision,
    decision: "publish",
    reason: "Reviewed declared location and selected images",
  }).forEach(([k, v]) => data.set(k, v));
  return data;
}
function profile(role: string) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: { app_role: role } })),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  mock.db.from.mockReturnValue(q);
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.require.mockResolvedValue({ supabase: mock.db, user: { id: "staff" } });
  profile("moderator");
  mock.db.rpc.mockResolvedValue({ error: null });
});
it.each(["en", "es"])(
  "submits explicit %s staff review with exact revision and reason",
  async (locale) => {
    await expect(reviewAccommodation(form(locale))).rejects.toThrow(
      `redirect:/${locale}/staff/accommodations?result=reviewed`,
    );
    expect(mock.db.rpc).toHaveBeenCalledWith("review_accommodation_property", {
      p_property: property,
      p_revision: revision,
      p_publish: true,
      p_reason: "Reviewed declared location and selected images",
    });
    expect(mock.revalidate).toHaveBeenCalledWith(
      `/${locale}/staff/accommodations`,
    );
  },
);
it("denies non-staff and malformed requests before review mutation", async () => {
  profile("consumer");
  await expect(reviewAccommodation(form())).rejects.toThrow(
    "redirect:/en/account",
  );
  expect(mock.db.rpc).not.toHaveBeenCalled();
  const invalid = form();
  invalid.delete("revision");
  await reviewAccommodation(invalid);
  expect(mock.require).toHaveBeenCalledTimes(1);
});
it("preserves explicit failure after stale revision or unavailable SQL", async () => {
  mock.db.rpc.mockResolvedValue({ error: { code: "PT409" } });
  await expect(reviewAccommodation(form())).rejects.toThrow(
    "result=unavailable",
  );
});

it.each(["en", "es"])(
  "renders the bounded %s queue with explicit revision/reason and a closed schema gate",
  async (locale) => {
    vi.stubEnv("AKISUITE_INDEPENDENT_ACCOMMODATION_ENABLED", "true");
    mock.db.rpc.mockResolvedValue({
      data: { rows: [], total: 0 },
      error: null,
    });
    const html = renderToStaticMarkup(
      await ReviewPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain(
      locale === "es"
        ? "Revisar alojamientos independientes"
        : "Review independent stays",
    );
    expect(mock.db.rpc).toHaveBeenCalledWith(
      "pending_accommodation_properties",
      { p_limit: 20, p_offset: 0 },
    );
    vi.stubEnv("AKISUITE_INDEPENDENT_ACCOMMODATION_ENABLED", "false");
    await expect(
      ReviewPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("not_found");
    vi.unstubAllEnvs();
  },
);
