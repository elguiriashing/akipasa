import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  product: "",
  getUser: vi.fn(),
  rpc: vi.fn(),
  client: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-akipasa-product": mocks.product }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error("redirect"), { path });
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.client,
}));

import { acceptTerms } from "../src/app/[locale]/terms/accept/actions";
import { config } from "../src/lib/config";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.product = "";
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "disposable-member" } },
  });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.client.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  });
});

function form(next = "/en/account?tab=saved", locale = "en", accepted = true) {
  const data = new FormData();
  data.set("locale", locale);
  data.set("next", next);
  if (accepted) data.set("acceptTerms", "accepted");
  return data;
}

async function destination(data: FormData) {
  try {
    await acceptTerms(data);
    throw new Error("Expected redirect");
  } catch (error) {
    const path = (error as { path?: string }).path;
    if (!path) throw error;
    return new URL(path, "https://akipasa.com");
  }
}

it("requires the explicit checkbox before opening a client or recording consent", async () => {
  const url = await destination(form(undefined, undefined, false));
  expect(url.pathname).toBe("/en/terms/accept");
  expect(url.searchParams.get("error")).toBe("required");
  expect(url.searchParams.get("next")).toBe("/en/account?tab=saved");
  expect(mocks.client).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("returns a guest through sign-in to the same terms task without an RPC", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  const url = await destination(form());
  expect(url.pathname).toBe("/en/auth");
  const terms = new URL(url.searchParams.get("next")!, url.origin);
  expect(terms.pathname).toBe("/en/terms/accept");
  expect(terms.searchParams.get("next")).toBe("/en/account?tab=saved");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it.each(["en", "es"])(
  "records only the configured version and %s locale for the authenticated caller",
  async (locale) => {
    const next = `/${locale}/account?tab=saved`;
    const data = form(next, locale);
    data.set("user_id", "forged-other-member");
    data.set("terms_version", "2099-forged");
    expect((await destination(data)).pathname).toBe(`/${locale}/account`);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("accept_current_terms", {
      p_version: config.currentTermsVersion,
      p_locale: locale,
    });
  },
);

it("returns an RPC error to a sanitized retry and retains the safe task", async () => {
  mocks.rpc.mockResolvedValue({
    error: { message: "private-provider-detail" },
  });
  const url = await destination(form());
  expect(url.pathname).toBe("/en/terms/accept");
  expect(url.searchParams.get("error")).toBe("save");
  expect(url.searchParams.get("next")).toBe("/en/account?tab=saved");
  expect(url.href).not.toContain("private-provider-detail");
});

it.each([
  ["", "/en/account?tab=saved"],
  ["akiduermo", "/stays/disposable-stay?step=dates"],
  ["akiconduzco", "/rentals/disposable-car?step=dates"],
])(
  "preserves an allowed %s destination after success",
  async (product, next) => {
    mocks.product = product;
    const url = await destination(form(next));
    expect(url.pathname + url.search).toBe(next);
  },
);

it.each(["", "akiduermo", "akiconduzco"])(
  "rejects external return URLs for %s",
  async (product) => {
    mocks.product = product;
    const url = await destination(form("https://attacker.invalid/steal"));
    expect(url.origin).toBe("https://akipasa.com");
    expect(url.href).not.toContain("attacker.invalid");
    expect(mocks.rpc).toHaveBeenCalledOnce();
  },
);
