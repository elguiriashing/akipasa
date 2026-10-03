import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AwardManager } from "../src/app/[locale]/admin/passports/awards/AwardManager";
import { passportAdminAction } from "../src/app/[locale]/admin/passports/awards/actions";
vi.mock("../src/app/[locale]/admin/passports/awards/actions", () => ({
  passportAdminAction: vi.fn(),
}));
vi.mock("../src/components/CityStamps", () => ({
  CityStamps: () => <div>City preview</div>,
}));
const member = {
  id: "member",
  email: "test@example.test",
  display_name: "Tester",
  test_account: true,
};
const snapshot = {
  test_account: true,
  grants_total: 31,
  grants_page: 1,
  collection: {
    updated_at: "2026-10-03",
    families: [
      {
        family_key: "stamp/fuengirola/cafe",
        city_key: "fuengirola",
        category_key: "cafe",
        archived: false,
        current_count: 5,
        available: 10,
        remaining: 5,
        milestones: [1, 2, 3, 4, 5].map((tier) => ({
          key: `cafe_${tier}`,
          tier,
          target: tier,
          title_en: `Cafe ${tier}`,
          title_es: `Café ${tier}`,
          unlocked_at: tier === 2 ? "2026-10-03" : null,
          manual_at: tier === 3 ? "2026-10-03" : null,
        })),
      },
    ],
  },
  grants: Array.from({ length: 15 }, (_, i) => ({
    id: `grant-${i}`,
    achievement_key: "cafe_3",
    title_en: `Award ${i}`,
    title_es: `Premio ${i}`,
    city_key: "fuengirola",
    category_key: "cafe",
    purpose: "test",
    reason: "Visual test",
    batch_id: "batch",
    granted_at: "2026-10-03T12:00:00Z",
    revoked_at: null,
  })),
};
beforeEach(() => {
  vi.mocked(passportAdminAction).mockImplementation(async (_locale, input) => ({
    data:
      (input as { action: string }).action === "read" ? snapshot : { ok: true },
  }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function setup() {
  render(
    <AwardManager
      locale="en"
      initialMember={member}
      initialSnapshot={snapshot}
    />,
  );
  fireEvent.change(screen.getByLabelText("Required reason"), {
    target: { value: "Visual test" },
  });
}
it("applies the selected tier on the first click, without a review dialog", async () => {
  setup();
  fireEvent.change(screen.getByLabelText("Tier"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply award" }));
  await waitFor(() =>
    expect(passportAdminAction).toHaveBeenCalledWith(
      "en",
      expect.objectContaining({
        action: "grant",
        payload: expect.objectContaining({
          achievement_key: "cafe_2",
          profile_id: "member",
        }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Apply award" })).toBeEnabled(),
  );
  expect(
    vi
      .mocked(passportAdminAction)
      .mock.calls.filter(
        ([, p]) => (p as { action: string }).action === "grant",
      ),
  ).toHaveLength(1);
  expect(screen.queryByText("Confirm change")).not.toBeInTheDocument();
});
it("revokes in place and paginates with the selected city and status", async () => {
  setup();
  fireEvent.click(screen.getAllByRole("button", { name: /^Revoke$/ })[0]);
  await waitFor(() =>
    expect(passportAdminAction).toHaveBeenCalledWith(
      "en",
      expect.objectContaining({
        action: "revoke",
        payload: expect.objectContaining({ grant_id: "grant-0" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled(),
  );
  vi.mocked(passportAdminAction).mockResolvedValue({
    data: { ...snapshot, grants_page: 2 },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(passportAdminAction).toHaveBeenCalledWith(
      "en",
      expect.objectContaining({
        action: "history",
        payload: expect.objectContaining({ page: "2" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled(),
  );
  fireEvent.change(screen.getByLabelText("Status"), {
    target: { value: "active" },
  });
  await waitFor(() =>
    expect(passportAdminAction).toHaveBeenCalledWith(
      "en",
      expect.objectContaining({
        action: "history",
        payload: expect.objectContaining({
          page: "1",
          history_state: "active",
        }),
      }),
    ),
  );
  expect(screen.getAllByRole("article")).toHaveLength(15);
});
it("protects the natural floor and reuses the request ID after an uncertain failure", async () => {
  setup();
  expect(
    screen.getByText(/Naturally earned tier is retained/),
  ).toBeInTheDocument();
  vi.mocked(passportAdminAction).mockRejectedValueOnce(new Error("network"));
  fireEvent.click(screen.getByRole("button", { name: "Apply award" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Apply award" })).toBeEnabled(),
  );
  const first = vi.mocked(passportAdminAction).mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "Apply award" }));
  await waitFor(() => expect(passportAdminAction).toHaveBeenCalledTimes(3));
  expect(vi.mocked(passportAdminAction).mock.calls[1][1]).toEqual(first);
  expect(
    within(screen.getByRole("navigation", { name: "History pages" })).getByRole(
      "button",
      { name: "Previous" },
    ),
  ).toBeDisabled();
});

it("keeps all ten level-zero stamp slots visible and selectable on the city image", async () => {
  const { CityCardStamps } = await vi.importActual<
    typeof import("../src/components/CityStamps")
  >("../src/components/CityStamps");
  const onSelect = vi.fn();
  render(
    <CityCardStamps
      city="fuengirola"
      locale="en"
      families={[]}
      selected={null}
      onSelect={onSelect}
    />,
  );
  const group = screen.getByRole("group", { name: "Stamps on this card" });
  expect(within(group).getAllByRole("button")).toHaveLength(10);
  for (const button of within(group).getAllByRole("button"))
    expect(button).toHaveAttribute("data-tier", "0");
  fireEvent.click(
    within(group).getByRole("button", { name: /Cafés · Unearned/ }),
  );
  expect(onSelect).toHaveBeenCalledWith("cafe");
});
