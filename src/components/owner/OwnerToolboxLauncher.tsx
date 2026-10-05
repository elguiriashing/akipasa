"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import scopes from "@/lib/achievement-scopes.json";
import { designs } from "@/lib/pals/engine";
import { rankName, finishName, tierName } from "@/lib/passport-collection";
import type { OwnerPreferences } from "@/lib/owner-console";
import { passportAdminAction } from "@/app/[locale]/admin/passports/awards/actions";
import {
  ownerPalsGrant,
  saveToolboxAppearance,
} from "@/app/[locale]/owner/actions";
type Tab = "themes" | "passport" | "achievements" | "pals";
type Snap = {
  test_account: boolean;
  collection: {
    families: Array<{
      family_key: string;
      city_key: string | null;
      category_key: string | null;
      archived?: boolean;
      milestones: Array<{
        key: string;
        tier: number;
        title_en: string;
        title_es: string;
      }>;
    }>;
  };
};
const bgs = [
  "default",
  "aurora",
  "midnight",
  "synthwave",
  "paper",
  "none",
] as const;
const accents = ["orange", "teal", "violet", "pink", "gold"] as const;
export function OwnerToolboxLauncher({
  locale,
  preferences,
  userId,
}: {
  locale: "en" | "es";
  preferences: OwnerPreferences;
  userId: string;
}) {
  const es = locale === "es",
    [open, setOpen] = useState(false),
    [tab, setTab] = useState<Tab>("themes"),
    [pending, start] = useTransition(),
    [message, setMessage] = useState("");
  const [bg, setBg] = useState(preferences.background),
    [accent, setAccent] = useState(preferences.accent),
    [motion, setMotion] = useState(preferences.motion),
    [glass, setGlass] = useState(preferences.glass),
    [mode, setMode] = useState<"light" | "dark">("dark");
  const [snap, setSnap] = useState<Snap | null>(null),
    [city, setCity] = useState("fuengirola"),
    [category, setCategory] = useState("cafe"),
    [stampTier, setStampTier] = useState(1),
    [cityTier, setCityTier] = useState(1),
    [achievement, setAchievement] = useState("");
  const [pk, setPk] = useState("threads"),
    [amount, setAmount] = useState(100),
    [item, setItem] = useState(designs[0]?.id || "");
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.ownerBackground = preferences.background;
    r.dataset.ownerAccent = preferences.accent;
    r.dataset.ownerMotion = String(preferences.motion);
    r.dataset.ownerGlass = String(preferences.glass);
  }, [preferences]);
  useEffect(() => {
    setMode(
      document.documentElement.dataset.theme === "light" ? "light" : "dark",
    );
    const fn = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    if (!open || snap) return;
    start(async () => {
      const r = await passportAdminAction(locale, {
        action: "read",
        payload: {
          profile_id: userId,
          page: "1",
          history_city: "",
          history_state: "all",
        },
      });
      if (r.error) setMessage(r.error);
      else setSnap(r.data as Snap);
    });
  }, [open, snap, locale, userId]);
  const general = useMemo(
    () =>
      snap?.collection.families.filter(
        (f) => !f.city_key && !f.category_key && !f.archived,
      ) || [],
    [snap],
  );
  const preview = (b = bg, a = accent) => {
    const r = document.documentElement;
    r.dataset.ownerBackground = b;
    r.dataset.ownerAccent = a;
    r.dataset.ownerMotion = String(motion);
    r.dataset.ownerGlass = String(glass);
  };
  const setThemeMode = (v: "light" | "dark") => {
    setMode(v);
    for (const el of [document.documentElement, document.body]) {
      el.dataset.theme = v;
      el.classList.remove("theme-light", "theme-dark");
      el.classList.add("theme-" + v);
    }
    try {
      localStorage.setItem("akipasa.theme", v);
    } catch {}
    window.dispatchEvent(
      new CustomEvent("akipasa:theme-change", { detail: v }),
    );
  };
  const ensureTest = async () => {
    if (snap?.test_account) return true;
    const r = await passportAdminAction(locale, {
      action: "mark_test",
      payload: { profile_id: userId, enabled: true },
    });
    if (r.error) {
      setMessage(r.error);
      return false;
    }
    setSnap((s) => (s ? { ...s, test_account: true } : s));
    return true;
  };
  const grantPassport = (kind: "stamp" | "city") =>
    start(async () => {
      if (!(await ensureTest())) return;
      const fam = snap?.collection.families.find((f) =>
        kind === "city"
          ? f.city_key === city && !f.category_key
          : f.city_key === city && f.category_key === category,
      );
      const selectedTier = kind === "city" ? cityTier : stampTier;
      const m = fam?.milestones.find((x) => x.tier === selectedTier);
      if (!m) {
        setMessage("Tier unavailable");
        return;
      }
      const r = await passportAdminAction(locale, {
        action: "grant",
        payload: {
          profile_id: userId,
          achievement_key: m.key,
          purpose: "test",
          reason: "Owner toolbox visual test",
          request_id: crypto.randomUUID(),
        },
      });
      setMessage(
        r.error ||
          "Granted: " + m[("title_" + locale) as "title_en" | "title_es"],
      );
      setSnap(null);
    });
  const grantAchievement = () =>
    start(async () => {
      if (!(await ensureTest())) return;
      const m = general.find((f) => f.family_key === achievement)
        ?.milestones[0];
      if (!m) return;
      const r = await passportAdminAction(locale, {
        action: "grant",
        payload: {
          profile_id: userId,
          achievement_key: m.key,
          purpose: "test",
          reason: "Owner toolbox achievement test",
          request_id: crypto.randomUUID(),
        },
      });
      setMessage(
        r.error ||
          "Granted: " + m[("title_" + locale) as "title_en" | "title_es"],
      );
      setSnap(null);
    });
  return (
    <>
      <button
        type="button"
        className="owner-toolbox-trigger"
        onClick={() => setOpen(true)}
      >
        <span>DEV</span> Toolbox
      </button>
      {open && (
        <div className="owner-toolbox-layer" onMouseDown={() => setOpen(false)}>
          <aside
            className="owner-toolbox-panel owner-toolbox-panel--tester"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span>OWNER / LIVE TEST</span>
                <h2>{es ? "Caja de pruebas" : "Test toolbox"}</h2>
                <p>
                  {es
                    ? "Controles directos de tu cuenta"
                    : "Direct controls for your account"}
                </p>
              </div>
              <button onClick={() => setOpen(false)}>X</button>
            </header>
            <nav className="owner-toolbox-tabs">
              {(
                [
                  ["themes", es ? "Temas" : "Themes"],
                  ["passport", "Passport"],
                  ["achievements", es ? "Logros" : "Achievements"],
                  ["pals", "AkiPals"],
                ] as [Tab, string][]
              ).map(([k, l]) => (
                <button
                  key={k}
                  className={tab === k ? "active" : ""}
                  onClick={() => {
                    setTab(k);
                    setMessage("");
                  }}
                >
                  {l}
                </button>
              ))}
            </nav>
            <div className="owner-toolbox-workspace">
              {tab === "themes" && (
                <>
                  <label>Brightness</label>
                  <div className="owner-toolbox-choice-row">
                    {(["light", "dark"] as const).map((v) => (
                      <button
                        key={v}
                        className={mode === v ? "active" : ""}
                        onClick={() => setThemeMode(v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <label>Theme</label>
                  <div className="owner-toolbox-theme-grid">
                    {bgs.map((v) => (
                      <button
                        key={v}
                        className={bg === v ? "active" : ""}
                        onClick={() => {
                          setBg(v);
                          preview(v, accent);
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <label>Accent</label>
                  <div className="owner-toolbox-choice-row">
                    {accents.map((v) => (
                      <button
                        key={v}
                        className={accent === v ? "active" : ""}
                        onClick={() => {
                          setAccent(v);
                          preview(bg, v);
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="owner-toolbox-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={motion}
                        onChange={(e) => {
                          setMotion(e.target.checked);
                          document.documentElement.dataset.ownerMotion = String(
                            e.target.checked,
                          );
                        }}
                      />{" "}
                      Motion
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={glass}
                        onChange={(e) => {
                          setGlass(e.target.checked);
                          document.documentElement.dataset.ownerGlass = String(
                            e.target.checked,
                          );
                        }}
                      />{" "}
                      Glass
                    </label>
                  </div>
                  <button
                    className="owner-toolbox-primary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await saveToolboxAppearance({
                          locale,
                          background: bg,
                          accent,
                          motion,
                          glass,
                        });
                        setMessage(r.error || "Appearance saved");
                      })
                    }
                  >
                    Save appearance
                  </button>
                </>
              )}
              {tab === "passport" && (
                <>
                  <p className="owner-toolbox-hint">
                    Grant test Passport progression to your own account.
                  </p>
                  <div className="owner-toolbox-fields">
                    <label>
                      City
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      >
                        {scopes.cities.map((x) => (
                          <option key={x.key} value={x.key}>
                            {x[locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Category
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {scopes.categories.map((x) => (
                          <option key={x.key} value={x.key}>
                            {x[locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Stamp tier
                      <select
                        value={stampTier}
                        onChange={(e) => setStampTier(+e.target.value)}
                      >
                        {[1, 2, 3, 4, 5].map((x) => (
                          <option key={x} value={x}>
                            {tierName(x, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      City rank
                      <select
                        value={cityTier}
                        onChange={(e) => setCityTier(+e.target.value)}
                      >
                        {[1, 2, 3, 4, 5, 6].map((x) => (
                          <option key={x} value={x}>
                            {rankName(x, locale)} · {finishName(x, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="owner-toolbox-action-row">
                    <button
                      disabled={pending || !snap}
                      onClick={() => grantPassport("stamp")}
                    >
                      Grant stamp
                    </button>
                    <button
                      disabled={pending || !snap}
                      onClick={() => grantPassport("city")}
                    >
                      Grant city rank
                    </button>
                  </div>
                </>
              )}
              {tab === "achievements" && (
                <>
                  <p className="owner-toolbox-hint">
                    Use the existing Admin award engine without leaving this
                    page.
                  </p>
                  <label>
                    Achievement
                    <select
                      value={achievement}
                      onChange={(e) => setAchievement(e.target.value)}
                    >
                      <option value="">Choose…</option>
                      {general.map((f) => (
                        <option key={f.family_key} value={f.family_key}>
                          {
                            f.milestones[0]?.[
                              ("title_" + locale) as "title_en" | "title_es"
                            ]
                          }
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="owner-toolbox-primary"
                    disabled={pending || !achievement}
                    onClick={grantAchievement}
                  >
                    Grant test achievement
                  </button>
                </>
              )}
              {tab === "pals" && (
                <>
                  <p className="owner-toolbox-hint">
                    Inject resources, modules or gear into your private AkiPals
                    save.
                  </p>
                  <label>
                    Grant
                    <select value={pk} onChange={(e) => setPk(e.target.value)}>
                      <option value="threads">Threads</option>
                      <option value="scrap">Scrap</option>
                      <option value="xp">XP</option>
                      <option value="wits">Wits module</option>
                      <option value="energy">Energy module</option>
                      <option value="charm">Charm module</option>
                      <option value="item">Item</option>
                    </select>
                  </label>
                  {pk === "item" ? (
                    <label>
                      Item
                      <select
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                      >
                        {designs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} · {d.rarity}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Amount
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={amount}
                        onChange={(e) =>
                          setAmount(Math.max(1, +e.target.value || 1))
                        }
                      />
                    </label>
                  )}
                  <button
                    className="owner-toolbox-primary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await ownerPalsGrant({
                          locale,
                          kind: pk,
                          ...(pk === "item" ? { design: item } : { amount }),
                        });
                        setMessage(r.error || "AkiPals updated");
                      })
                    }
                  >
                    Apply to my AkiPal
                  </button>
                </>
              )}
            </div>
            <div className="owner-toolbox-result" role="status">
              {pending ? "Applying…" : message || "Ready"}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
