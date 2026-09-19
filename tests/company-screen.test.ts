import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  resolve: vi.fn(),
  rpc: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("@/lib/ai-team/auth", () => ({
  AIAccessError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
  aiErrorResponse: (error: { message: string; status?: number }) =>
    Response.json({ message: error.message }, { status: error.status || 400 }),
  requireAIAdministrator: mocks.admin,
}));
vi.mock("../src/app/api/ai-team/venue-location-resolve/route", () => ({
  POST: mocks.resolve,
}));
import { OPTIONS, POST } from "../src/app/api/ai-team/company-screen/route";
const request = (origin = "https://crm.akipasa.com", auth = "Bearer test") =>
  new Request("https://akipasa.com/api/ai-team/company-screen", {
    method: "POST",
    headers: {
      origin,
      authorization: auth,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: "company-1",
      token: "3de481b2-c5e0-4584-933c-67a90af03767",
    }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "gt"])
    query[method] = () => query;
  query.maybeSingle = mocks.lookup;
  mocks.lookup.mockResolvedValue({
    data: {
      data: { name: "Cafe", address: "Calle A", city: "Madrid" },
      revision: 4,
    },
  });
  mocks.admin.mockResolvedValue({
    service: { from: () => query, rpc: mocks.rpc },
  });
  mocks.resolve.mockResolvedValue(
    Response.json({
      data: {
        status: "resolved",
        normalizedAddress: "Calle A 2",
        city: "Madrid",
        confidence: 0.95,
        evidenceUrls: ["https://example.com/address"],
        note: "Source match",
      },
    }),
  );
  mocks.rpc.mockResolvedValue({
    data: { status: "resolved", company: { address: "Calle A 2" } },
  });
});
it("rejects foreign origins and missing bearer before lookup or AI spend", async () => {
  expect((await POST(request("https://attacker.example"))).status).toBe(403);
  expect((await POST(request(undefined, ""))).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("requires an administrator and an active company lease", async () => {
  mocks.lookup.mockResolvedValueOnce({ data: null });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.resolve).not.toHaveBeenCalled();
  mocks.admin.mockRejectedValueOnce(new Error("Administrator required"));
  expect((await POST(request())).status).toBe(400);
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it("saves supported corrections under the original revision and lease", async () => {
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("access-control-allow-origin")).toBe(
    "https://crm.akipasa.com",
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "crm_company_screen_apply",
    expect.objectContaining({ p_revision: 4, p_id: "company-1" }),
  );
  expect((await response.json()).data.company.address).toBe("Calle A 2");
});
it("does not save insufficient, low-confidence or sourceless results", async () => {
  for (const resolution of [
    { status: "insufficient" },
    {
      status: "resolved",
      confidence: 0.6,
      evidenceUrls: ["https://example.com"],
    },
    { status: "resolved", confidence: 0.99, evidenceUrls: [] },
  ]) {
    mocks.resolve.mockResolvedValueOnce(Response.json({ data: resolution }));
    expect((await (await POST(request())).json()).data.status).toBe(
      "insufficient",
    );
  }
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("propagates AI budget errors without changing the company", async () => {
  mocks.resolve.mockResolvedValueOnce(
    Response.json({ message: "AI monthly budget exhausted" }, { status: 400 }),
  );
  expect((await POST(request())).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("allows preflight only for the CRM", () => {
  expect(OPTIONS(request()).status).toBe(204);
  expect(OPTIONS(request("https://other.example")).status).toBe(403);
});
