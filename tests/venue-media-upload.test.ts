import { beforeEach, expect, it, vi } from "vitest";

const upload = vi.hoisted(() => vi.fn());
vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  uploadVenueImage: upload,
}));
import { POST } from "../src/app/api/business/venue-media/route";

const url = "https://business.akipasa.com/api/business/venue-media";
function request(file?: File) {
  const body = new FormData();
  body.set("venueId", "8c1cf670-18c7-4dac-8c4b-bbc9b6ff05a3");
  if (file) body.set("image", file);
  return new Request(url, {
    method: "POST",
    headers: { origin: "https://business.akipasa.com" },
    body,
  });
}

beforeEach(() => vi.clearAllMocks());

it("passes a binary image through the authenticated upload action", async () => {
  upload.mockResolvedValue({
    ok: true,
    media: { id: "media", url: "https://example.test/signed", alt: "Logo" },
  });
  const response = await POST(
    request(new File(["png bytes"], "logo.png", { type: "image/png" })),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(upload).toHaveBeenCalledOnce();
  const data = upload.mock.calls[0][0] as FormData;
  expect(data.get("inline")).toBe("1");
  expect((data.get("image") as File).name).toBe("logo.png");
  expect(await response.json()).toMatchObject({ ok: true });
});

it("rejects a cross-origin upload before invoking the action", async () => {
  const attempt = request();
  attempt.headers.set("origin", "https://evil.example");
  expect((await POST(attempt)).status).toBe(403);
  expect(upload).not.toHaveBeenCalled();
});

it("reports storage rejection and invalid bodies without claiming success", async () => {
  upload.mockResolvedValue({ ok: false, error: "storage" });
  expect((await POST(request())).status).toBe(422);
  const response = await POST(
    new Request(url, {
      method: "POST",
      headers: { origin: "https://business.akipasa.com" },
      body: "invalid",
    }),
  );
  expect(response.status).toBe(415);
});
