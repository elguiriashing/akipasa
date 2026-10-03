import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  activeModules, adventures, applyAction, DAY, designs, families, initialState,
  MAX_INVENTORY, parcels, stats, type Action, type Context, type State,
} from "../src/lib/pals/engine";
import { escapeHtml, palSvg, statePortrait } from "../src/lib/pals/art";
import { payload } from "../src/lib/pals/view";
import { PALS_CLIENT, previewHtml } from "../src/components/pals/preview";

const now = Date.UTC(2026, 9, 4, 12);
let sequence = 0;
function context(extra: Partial<Context> = {}): Context {
  return { now, id: () => `test-${++sequence}`, random: () => 0.16, ...extra };
}
function adopted(): State {
  return applyAction(initialState(now), { type: "adopt", family: "moka", name: "Mochi" }, context());
}
function act(s: State, action: Action, extra: Partial<Context> = {}) {
  return applyAction(s, action, context(extra));
}
function complete(s: State, adventure: string, time = now) {
  let result = act(s, { type: "start", adventure }, { now: time });
  const story = adventures.find((a) => a.id === adventure)!;
  for (const step of story.steps) result = act(result, { type: "choice", index: step.options.findIndex((o) => o.need === 3) }, { now: time });
  return result;
}

describe("AkiPals catalogue and art", () => {
  it("has ten distinct interchangeable families and valid master outfits", () => {
    expect(families).toHaveLength(10);
    expect(new Set(families.map((f) => f.id)).size).toBe(10);
    for (const f of families) {
      expect(f.master).toHaveLength(4);
      for (const id of f.master) expect(designs.some((d) => d.id === id)).toBe(true);
      expect(palSvg(f.id, f.master, f.id)).toContain("<svg");
    }
  });
  it("uses unique designs and never puts earned keepsakes in the paid/soft shop", () => {
    expect(new Set(designs.map((d) => d.id)).size).toBe(designs.length);
    for (const d of designs.filter((d) => d.source === "earned")) expect(d.price).toBe(0);
  });
  it("escapes user-controlled text and draws only trusted vector assets", () => {
    expect(escapeHtml('<img src=x onerror="x">')).toBe("&lt;img src=x onerror=&quot;x&quot;&gt;");
    expect(statePortrait(adopted())).not.toContain("<script");
    expect(statePortrait(adopted())).not.toContain("<foreignObject");
  });
});

describe("AkiPals adoption and save safety", () => {
  it("requires adoption before any rewards", () => {
    expect(() => act(initialState(now), { type: "parcel" })).toThrow();
  });
  it("adopts exactly once, with four starter items and immutable input", () => {
    const before = initialState(now), after = act(before, { type: "adopt", family: "moka", name: "Mochi" });
    expect(before.family).toBe(null);
    expect(after.equipment).toHaveLength(4);
    expect(after.wardrobe).toHaveLength(4);
    expect(() => act(after, { type: "adopt", family: "brasa", name: "More loot" })).toThrow();
  });
  it("validates names and lets family changes preserve progress", () => {
    const s = adopted();
    expect(() => act(s, { type: "rename", name: "<script>" })).toThrow();
    expect(() => act(s, { type: "rename", name: " " })).toThrow();
    const changed = act(s, { type: "family", family: "brote" });
    expect(changed.equipment).toEqual(s.equipment);
    expect(changed.name).toBe(s.name);
    expect(stats(changed)).toEqual(stats(s));
  });
  it("returns no currency or inventory mutations after a rejected action", () => {
    const s = adopted(), before = JSON.stringify(s);
    expect(() => act(s, { type: "buy", sku: "chef-coat" })).toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("AkiPals daily parcels", () => {
  it("gives one initial parcel and caps the backlog at three", () => {
    const s = adopted();
    expect(parcels(s, now)).toBe(1);
    expect(parcels(s, now + DAY * 30)).toBe(3);
    expect(parcels(s, now - DAY * 3)).toBe(0);
  });
  it("allows each accumulated parcel exactly once", () => {
    let s = adopted();
    const later = now + 30 * DAY;
    for (let i = 0; i < 3; i++) s = act(s, { type: "parcel" }, { now: later });
    expect(parcels(s, later)).toBe(0);
    expect(() => act(s, { type: "parcel" }, { now: later })).toThrow();
    expect(s.threads).toBe(210);
  });
  it("opens the next parcel at the UTC boundary, not at the client's chosen time", () => {
    const beforeMidnight = Date.UTC(2026, 9, 4, 23, 59, 59);
    const s = act(adopted(), { type: "parcel" }, { now: beforeMidnight });
    expect(parcels(s, beforeMidnight)).toBe(0);
    expect(parcels(s, beforeMidnight + 1000)).toBe(1);
  });
  it("keeps appearances and compensates overflow instead of deleting rewards", () => {
    const s = adopted();
    while (s.equipment.length < MAX_INVENTORY) s.equipment.push({ ...s.equipment[0], id: `full-${s.equipment.length}`, sockets: [null] });
    const after = act(s, { type: "parcel" });
    expect(after.equipment).toHaveLength(MAX_INVENTORY);
    expect(after.scrap).toBe(s.scrap + 31);
    expect(after.wardrobe.length).toBeGreaterThanOrEqual(s.wardrobe.length);
  });
});

describe("AkiPals equipment", () => {
  it("charges exact shop costs and refuses to sell earned trophy gear", () => {
    const s = adopted(), d = designs.find((d) => d.id === "bucket-hat")!;
    const bought = act(s, { type: "buy", sku: d.id });
    expect(bought.threads).toBe(s.threads - d.price);
    expect(bought.equipment).toHaveLength(5);
    expect(() => act(s, { type: "buy", sku: "city-cup" })).toThrow();
  });
  it("opens sockets at a known cost, never beyond three", () => {
    let s = adopted(); s.scrap = 500;
    const id = s.equipment[0].id;
    s = act(s, { type: "socket", itemId: id });
    s = act(s, { type: "socket", itemId: id });
    expect(s.equipment[0].sockets).toHaveLength(3);
    expect(s.scrap).toBe(410);
    expect(() => act(s, { type: "socket", itemId: id })).toThrow();
  });
  it("returns swapped modules and prevents a seventh active module", () => {
    let s = adopted(); s.modules = { wits: 20, energy: 20, charm: 20 };
    for (const item of s.equipment) item.sockets = [null, null, null];
    for (let i = 0; i < 6; i++) s = act(s, { type: "module", itemId: s.equipment[Math.floor(i / 3)].id, index: i % 3, stat: "wits" });
    expect(activeModules(s)).toBe(6);
    expect(() => act(s, { type: "module", itemId: s.equipment[2].id, index: 0, stat: "charm" })).toThrow();
    s = act(s, { type: "module", itemId: s.equipment[0].id, index: 0, stat: "energy" });
    expect(activeModules(s)).toBe(6);
    expect(s.modules.wits).toBe(15);
    expect(s.modules.energy).toBe(19);
  });
  it("does not let equipping a stored item bypass the active module cap", () => {
    const s = adopted();
    s.equipment[0].sockets = ["wits", "wits", "wits"];
    s.equipment[1].sockets = ["energy", "energy", "energy"];
    const spare = { ...s.equipment[2], id: "spare", sockets: ["charm" as const] };
    s.equipment.push(spare);
    expect(() => act(s, { type: "equip", itemId: "spare" })).toThrow();
  });
  it("preserves appearances and refunds modules when scrapping", () => {
    let s = adopted(); const item = s.equipment[0];
    s = act(s, { type: "module", itemId: item.id, index: 0, stat: "wits" });
    expect(() => act(s, { type: "scrap", itemId: item.id })).toThrow();
    s = act(s, { type: "unequip", slot: "head" });
    s = act(s, { type: "scrap", itemId: item.id });
    expect(s.equipment).toHaveLength(3);
    expect(s.wardrobe).toContain(item.design);
    expect(s.modules.wits).toBe(2);
  });
  it("merges copies keeping maxima and returns the spare modules", () => {
    const s = adopted(); const item = s.equipment[0]; item.level = 5;
    s.equipment.push({ ...item, id: "spare", level: 2, sockets: ["energy", null, null] });
    const result = act(s, { type: "merge", itemId: item.id, duplicateId: "spare" });
    expect(result.equipment[0].level).toBe(5);
    expect(result.equipment[0].sockets).toHaveLength(3);
    expect(result.modules.energy).toBe(3);
    expect(result.equipment).toHaveLength(4);
    expect(() => act(s, { type: "merge", itemId: item.id, duplicateId: item.id })).toThrow();
  });
  it("changes appearance without changing the equipment's stats", () => {
    let s = adopted(); s.threads = 500;
    s = act(s, { type: "buy", sku: "headphones" });
    const before = stats(s);
    s = act(s, { type: "appearance", itemId: s.equipment[0].id, appearance: "headphones" });
    expect(stats(s)).toEqual(before);
    expect(() => act(s, { type: "appearance", itemId: s.equipment[0].id, appearance: "harbour-jacket" })).toThrow();
    expect(() => act(s, { type: "appearance", itemId: s.equipment[0].id, appearance: "master-crown" })).toThrow();
  });
  it("caps equipment levels and applies the advertised upgrade cost", () => {
    const s = adopted(); s.equipment[0].level = 9; s.scrap = 500;
    const after = act(s, { type: "upgrade", itemId: s.equipment[0].id });
    expect(after.equipment[0].level).toBe(10);
    expect(after.scrap).toBe(365);
    expect(() => act(after, { type: "upgrade", itemId: after.equipment[0].id })).toThrow();
  });
});

describe("AkiPals adventures and real achievements", () => {
  it("lets the basic loadout complete all three stories", () => {
    for (const adventure of adventures) {
      const s = complete(adopted(), adventure.id);
      expect(s.run?.successes).toBe(3);
      expect(s.run?.history).toHaveLength(3);
      expect(s.threads).toBe(125);
    }
  });
  it("takes a loadout snapshot and still provides a result for an ambitious failed choice", () => {
    let s = act(adopted(), { type: "start", adventure: "gig" });
    const snapshot = s.run!.stats;
    s.equipment[0].level = 10;
    s = act(s, { type: "choice", index: 2 });
    expect(s.run!.stats).toEqual(snapshot);
    expect(s.run!.history[0].success).toBe(false);
    expect(s.run!.step).toBe(1);
  });
  it("awards each story once per UTC day while allowing free replays", () => {
    let s = complete(adopted(), "gig"); const threads = s.threads;
    s = act(s, { type: "leave" }); s = complete(s, "gig");
    expect(s.threads).toBe(threads);
    s = act(s, { type: "leave" }); s = complete(s, "gig", now + DAY);
    expect(s.threads).toBe(threads + 35);
  });
  it("cannot finish twice or start over a live adventure", () => {
    const started = act(adopted(), { type: "start", adventure: "gig" });
    expect(() => act(started, { type: "start", adventure: "cafe" })).toThrow();
    expect(() => act(complete(adopted(), "gig"), { type: "choice", index: 0 })).toThrow();
  });
  it("requires verified achievement data and does not duplicate trophy claims", () => {
    const s = adopted();
    expect(() => act(s, { type: "claim" })).toThrow();
    const achievements = Array.from({ length: 10 }, (_, n) => ({ key: `earned-${n}`, city_key: n ? null : "fuengirola", unlocked_at: new Date(now).toISOString() }));
    const once = act(s, { type: "claim" }, { achievements });
    const twice = act(once, { type: "claim" }, { achievements });
    expect(once.claimed).toHaveLength(4);
    expect(once.claimed).toContain("city-fuengirola");
    expect(twice.equipment).toEqual(once.equipment);
    expect(twice.claimed).toEqual(once.claimed);
  });
  it("does not grant incomplete or archived achievements", () => {
    const s = act(adopted(), { type: "claim" }, { achievements: [
      { key: "not-yet", city_key: "fuengirola", unlocked_at: null },
      { key: "archived", city_key: "malaga", unlocked_at: new Date(now).toISOString(), archived: true },
    ] });
    expect(s.claimed).toHaveLength(0);
  });
});

describe("AkiPals preview privacy contracts", () => {
  it("produces a self-contained noindex page with a nonce and no tracking scripts", () => {
    const html = previewHtml("test-nonce");
    expect(html).toContain('content="noindex,nofollow,noarchive,nosnippet"');
    expect(html).toContain('script nonce="test-nonce"');
    expect(html).not.toContain("googletagmanager");
    expect(() => new Function(PALS_CLIENT)).not.toThrow();
  });
  it("does not include coordinates or profile details in the game state", () => {
    const value = JSON.stringify(payload(adopted(), 1, true, now));
    expect(value).not.toContain('"latitude"');
    expect(value).not.toContain('"longitude"');
    expect(value).not.toContain('"email"');
  });
  it("keeps all incoming rewards on the authenticated server path", () => {
    const api = readFileSync("src/app/pals/api/route.ts", "utf8");
    expect(api).toContain("previewAccess()");
    expect(api).toContain("pals_commit");
    expect(api).toContain("p_expected_version");
    expect(api).toContain('z.string().uuid()');
    expect(api).toContain('sec-fetch-site');
    expect(api).toContain("reader.cancel()");
    expect(api).toContain("my_achievement_progress");
  });
  it("gates the page and image endpoints and prevents shared caching", () => {
    for (const path of ["src/app/pals/route.ts", "src/app/pals/marker/route.ts"]) {
      const code = readFileSync(path, "utf8");
      expect(code).toContain("previewAccess()");
      expect(code).toContain("privateHeaders");
      expect(code).toContain("access.allowed");
    }
    const server = readFileSync("src/lib/pals/server.ts", "utf8");
    expect(server).toContain("private, no-store");
    expect(server).toContain('select("app_role")');
    expect(server).not.toContain("user.user_metadata");
  });
});
