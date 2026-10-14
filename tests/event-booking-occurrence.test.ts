import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  requireUser: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));

import { requestEventBooking } from "../src/app/[locale]/events/[slug]/book/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.requireUser.mockResolvedValue({ supabase: { rpc: mocks.rpc } });
});

function bookingForm() {
  const form = new FormData();
  Object.entries({
    locale: "en",
    slug: "local-event",
    eventId: "30000000-0000-4000-8000-000000000001",
    slotId: "30000000-0000-4000-8000-000000000002",
    partySize: "2",
    contactName: "Local Guest",
    contactEmail: "guest@example.test",
    contactPhone: "",
    notes: "",
    requestKey: "30000000-0000-4000-8000-000000000003",
    occurrence: "chosen-occurrence",
  }).forEach(([name, value]) => form.set(name, value));
  return form;
}

it("preserves the selected occurrence through auth and booking success", async () => {
  await expect(requestEventBooking(bookingForm())).rejects.toThrow(
    "redirect:/en/events/local-event/book?occurrence=chosen-occurrence&requested=1",
  );
  expect(mocks.requireUser).toHaveBeenCalledWith(
    "en",
    "/en/events/local-event/book?occurrence=chosen-occurrence",
  );
});

it("preserves the selected occurrence after validation failure", async () => {
  const form = bookingForm();
  form.set("partySize", "0");
  await expect(requestEventBooking(form)).rejects.toThrow(
    "redirect:/en/events/local-event/book?occurrence=chosen-occurrence&error=validation",
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});
