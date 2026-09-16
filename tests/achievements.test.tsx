// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  achievementSchema,
  achievementBadge,
  type Achievement,
} from "../src/lib/achievements";
import { AchievementCollection } from "../src/components/AchievementCollection";
import scopes from "../src/lib/achievement-scopes.json";
import cityPhotos from "../src/lib/city-photos.json";
import { badgeProgress } from "../src/lib/badges";
import { AchievementManager } from "../src/app/[locale]/admin/achievements/AchievementManager";

vi.mock("../src/app/[locale]/admin/achievements/actions", () => ({
  saveAchievement: vi.fn(),
  deleteAchievement: vi.fn(),
}));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
const milestone: Achievement = {
  key: "coast_explorer",
  title_es: "Explorador costero",
  title_en: "Coastal explorer",
  description_es: "Explora la costa con 250 XP.",
  description_en: "Explore the coast with 250 XP.",
  minimum_xp: 250,
  condition_type: "xp",
  target_count: 250,
  city_key: null,
  category_key: null,
  icon: "discover",
  active: true,
  updated_at: "2026-09-16T10:00:00+00:00",
};

describe("managed achievements", () => {
  it("validates translations and bounded integer XP before saving", () => {
    expect(achievementSchema.safeParse(milestone).success).toBe(true);
    for (const minimum_xp of [0, -1, 1.5, 1000001, NaN, Infinity, ""])
      expect(
        achievementSchema.safeParse({ ...milestone, minimum_xp }).success,
      ).toBe(false);
    expect(
      achievementSchema.safeParse({ ...milestone, title_en: " " }).success,
    ).toBe(false);
    expect(
      achievementSchema.safeParse({ ...milestone, icon: "unknown" }).success,
    ).toBe(false);
  });
  it("uses the supplied catalogue without resurrecting removed defaults", () => {
    const badge = achievementBadge(milestone);
    expect(badgeProgress(249, [badge]).remainingXp).toBe(1);
    expect(badgeProgress(250, [badge]).earned[0].key).toBe(milestone.key);
    expect(badgeProgress(10000, [])).toEqual({
      earned: [],
      next: null,
      remainingXp: 0,
    });
    expect(badgeProgress(NaN, [badge]).earned).toEqual([]);
    const earlier = { ...badge, key: "early", minimumXp: 20 };
    expect(badgeProgress(0, [badge, earlier]).next?.key).toBe("early");
  });
  it("searches both languages and separates active achievements from drafts", () => {
    render(
      <AchievementManager
        locale="en"
        achievements={[
          milestone,
          {
            ...milestone,
            key: "draft_one",
            active: false,
            title_en: "Secret milestone",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Drafts" }));
    expect(
      screen.queryByRole("heading", { name: "Coastal explorer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Secret milestone" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "costero" },
    });
    expect(
      screen.getByRole("heading", { name: "Coastal explorer" }),
    ).toBeInTheDocument();
  });
  it("opens an editable preview with the stored rule and both translations", () => {
    render(<AchievementManager locale="en" achievements={[milestone]} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Coastal explorer" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("XP target")).toHaveValue(250);
    expect(dialog.getByLabelText("Name (EN)")).toHaveValue("Coastal explorer");
    fireEvent.click(dialog.getByRole("button", { name: "Español" }));
    expect(dialog.getByLabelText("Name (ES)")).toHaveValue(
      "Explorador costero",
    );
    expect(dialog.getByRole("radio", { name: "Explore" })).toBeChecked();
  });
  it("starts new achievements as drafts and requires explicit deletion confirmation", () => {
    render(<AchievementManager locale="en" achievements={[milestone]} />);
    fireEvent.click(screen.getByRole("button", { name: "New achievement" }));
    expect(screen.getByLabelText("Visibility")).toHaveValue("false");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Coastal explorer" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("checkbox")).toBeRequired();
    expect(dialog.getByRole("checkbox")).not.toBeChecked();
    expect(dialog.getByText(/Their XP is preserved/)).toBeInTheDocument();
  });
});

describe("activity conditions", () => {
  it("rejects invented scopes and contradictory conditions", () => {
    expect(
      achievementSchema.safeParse({
        ...milestone,
        condition_type: "venues",
        target_count: 5,
        city_key: "fuengirola",
        category_key: "restaurant",
      }).success,
    ).toBe(true);
    for (const change of [
      { condition_type: "arbitrary_code" },
      { target_count: 0 },
      { target_count: 1.5 },
      { city_key: "made-up" },
      { category_key: "invented" },
      { condition_type: "xp", city_key: "fuengirola" },
    ])
      expect(
        achievementSchema.safeParse({ ...milestone, ...change }).success,
      ).toBe(false);
  });
  it("lets admins configure a city and category together", () => {
    render(
      <AchievementManager
        locale="en"
        achievements={[
          {
            ...milestone,
            condition_type: "venues",
            target_count: 5,
            city_key: "fuengirola",
            category_key: "restaurant",
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Coastal explorer" }),
    );
    expect(screen.getByLabelText("Condition")).toHaveValue("venues");
    expect(screen.getByLabelText("City")).toHaveValue("fuengirola");
    expect(screen.getByLabelText("Category")).toHaveValue("restaurant");
    expect(screen.getByLabelText("Target")).toHaveValue(5);
    fireEvent.change(screen.getByLabelText("Condition"), {
      target: { value: "active_days" },
    });
    expect(screen.queryByLabelText("City")).not.toBeInTheDocument();
  });
});

describe("member achievement collection", () => {
  it("covers all frontend major cities plus Fuengirola", () => {
    expect(scopes.cities.map((city) => city.key).sort()).toEqual(
      [...new Set([...Object.keys(cityPhotos), "fuengirola"])].sort(),
    );
  });
  it("limits initial cards, searches cities and filters earned badges", () => {
    const items = Array.from({ length: 30 }, (_, n) => ({
      ...milestone,
      key: `fixture_${n}`,
      title_en: n === 29 ? "Fuengirola Amateur" : `Explorer ${n}`,
      condition_type: "venues" as const,
      target_count: 5,
      city_key: n === 29 ? "fuengirola" : "madrid",
      current_count: n === 29 ? 5 : 2,
      unlocked_at: n === 29 ? "2026-09-16T10:00:00Z" : null,
    }));
    render(<AchievementCollection locale="en" items={items} totalXp={50} />);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    fireEvent.click(
      screen.getByRole("button", { name: "Discover more achievements" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(24);
    fireEvent.change(screen.getByLabelText("Progress"), {
      target: { value: "earned" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Fuengirola Amateur" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Progress"), {
      target: { value: "all" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cities" }));
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "fuengirola" },
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "5");
  });
});
