"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import scopes from "@/lib/achievement-scopes.json";
import {
  familyProgress,
  stampSymbols,
  tierName,
  rankName,
  finishName,
  type PassportCollection,
} from "@/lib/passport-collection";
import { CityStamps } from "@/components/CityStamps";
import { passportAdminAction } from "./actions";
import styles from "./awards.module.css";
type Member = {
  id: string;
  display_name: string;
  email: string;
  test_account: boolean;
};
type Grant = {
  id: string;
  achievement_key: string;
  city_key: string | null;
  category_key: string | null;
  title_en: string;
  title_es: string;
  purpose: string;
  reason: string;
  batch_id: string;
  granted_at: string;
  revoked_at: string | null;
  superseded_by?: string | null;
  tier_index?: number;
};
type Snapshot = {
  collection: PassportCollection;
  test_account: boolean;
  grants: Grant[];
  grants_total?: number;
  grants_page?: number;
};
export function AwardManager({
  locale,
  initialMember = null,
  initialSnapshot = null,
}: {
  locale: Locale;
  initialMember?: Member | null;
  initialSnapshot?: Snapshot | null;
}) {
  const es = locale === "es";
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(initialMember);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initialSnapshot);
  const [city, setCity] = useState("fuengirola");
  const [category, setCategory] = useState("cafe");
  const [kind, setKind] = useState("stamp");
  const [tier, setTier] = useState(1);
  const [general, setGeneral] = useState("");
  const [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState("recognition");
  const [preset, setPreset] = useState("mixed");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const retry = useRef<{ signature: string; id: string } | null>(null);
  const [historyCity, setHistoryCity] = useState("");
  const [historyState, setHistoryState] = useState("all");
  const family = snapshot?.collection.families.find((f) =>
    kind === "general"
      ? f.family_key === general
      : kind === "city"
        ? f.city_key === city && !f.category_key
        : f.city_key === city && f.category_key === category,
  );
  const progress = familyProgress(family);
  const milestone = family?.milestones.find(
    (m) => kind === "general" || m.tier === tier,
  );
  async function refresh(
    id: string,
    page = snapshot?.grants_page || 1,
    filterCity = historyCity,
    filterState = historyState,
    historyOnly = false,
  ) {
    const r = await passportAdminAction(locale, {
      action: historyOnly ? "history" : "read",
      payload: {
        profile_id: id,
        page: String(page),
        history_city: filterCity,
        history_state: filterState,
      },
    });
    if (r.error) setMessage(r.error);
    else
      setSnapshot((previous) =>
        historyOnly && previous
          ? { ...previous, ...(r.data as Partial<Snapshot>) }
          : (r.data as Snapshot),
      );
  }
  function request(
    action: string,
    payload: Record<string, string | boolean>,
    label: string,
  ) {
    if (!member || busy.current || reason.trim().length < 3) return;
    busy.current = true;
    const profileId = member.id;
    const signature = JSON.stringify({ action, payload, profileId, reason });
    if (retry.current?.signature !== signature)
      retry.current = { signature, id: crypto.randomUUID() };
    const requestId = retry.current.id;
    setMessage("");
    start(async () => {
      try {
        const r = await passportAdminAction(locale, {
          action,
          payload: {
            ...payload,
            profile_id: profileId,
            reason,
            request_id: requestId,
          },
        });
        if (r.error) setMessage(r.error);
        else {
          retry.current = null;
          setMessage(`${es ? "Guardado" : "Saved"}: ${label}`);
          await refresh(profileId);
        }
      } catch {
        setMessage(
          es
            ? "No se pudo guardar. Inténtalo de nuevo."
            : "Could not save. Please retry.",
        );
      } finally {
        busy.current = false;
      }
    });
  }
  function historyPage(
    page: number,
    filterCity = historyCity,
    filterState = historyState,
  ) {
    if (!member || pending) return;
    setHistoryCity(filterCity);
    setHistoryState(filterState);
    start(() => refresh(member.id, page, filterCity, filterState, true));
  }
  return (
    <div className={styles.manager}>
      <form
        className={styles.search}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await passportAdminAction(locale, {
              action: "search",
              payload: { query },
            });
            setUsers((r.data || []) as Member[]);
            setMessage(
              r.error ||
                ((r.data as Member[])?.length
                  ? ""
                  : es
                    ? "Sin resultados"
                    : "No results"),
            );
          });
        }}
      >
        <label>
          {es
            ? "Buscar usuario por nombre, email o ID"
            : "Find member by name, email or ID"}
          <input
            required
            minLength={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button disabled={pending}>{es ? "Buscar" : "Search"}</button>
      </form>
      <div className={styles.users}>
        {users.map((u) => (
          <button
            key={u.id}
            disabled={pending}
            onClick={() => {
              setMember(u);
              setSnapshot(null);

              setHistoryCity("");
              setHistoryState("all");
              start(() => refresh(u.id, 1, "", "all"));
            }}
          >
            <strong>{u.display_name || u.email}</strong>
            <span>{u.email}</span>
            <small>{u.id}</small>
          </button>
        ))}
      </div>
      <p role="status">
        {pending
          ? es
            ? "Guardando o cargando…"
            : "Saving or loading…"
          : message}
      </p>
      {member && snapshot && (
        <>
          <section className={styles.identity}>
            <h3>{member.display_name || member.email}</h3>
            <p>{member.email}</p>
            <code>{member.id}</code>
            <label>
              <input
                type="checkbox"
                checked={snapshot.test_account}
                disabled={pending}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  start(async () => {
                    const r = await passportAdminAction(locale, {
                      action: "mark_test",
                      payload: { profile_id: member.id, enabled },
                    });
                    if (r.error) setMessage(r.error);
                    else await refresh(member.id);
                  });
                }}
              />
              {es ? "Cuenta de prueba explícita" : "Designated test account"}
            </label>
          </section>
          <div className={styles.columns}>
            <section className={styles.form}>
              <h3>{es ? "Otorgar reconocimiento" : "Grant an award"}</h3>
              <label>
                {es ? "Tipo" : "Type"}
                <select
                  disabled={pending}
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setTier(1);
                  }}
                >
                  <option value="stamp">
                    {es ? "Sello de categoría" : "Category stamp"}
                  </option>
                  <option value="city">
                    {es ? "Rango de ciudad" : "City rank"}
                  </option>
                  <option value="general">
                    {es ? "Logro general" : "General achievement"}
                  </option>
                </select>
              </label>
              {kind !== "general" ? (
                <>
                  <label>
                    {es ? "Ciudad" : "City"}
                    <select
                      disabled={pending}
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                      }}
                    >
                      {scopes.cities.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c[locale]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {kind === "stamp" && (
                    <label>
                      {es ? "Categoría" : "Category"}
                      <select
                        disabled={pending}
                        value={category}
                        onChange={(e) => {
                          setCategory(e.target.value);
                        }}
                      >
                        {scopes.categories.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c[locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    {es ? "Nivel" : "Tier"}
                    <select
                      disabled={pending}
                      value={tier}
                      onChange={(e) => {
                        setTier(Number(e.target.value));
                      }}
                    >
                      {Array.from(
                        { length: kind === "city" ? 6 : 5 },
                        (_, i) => (
                          <option key={i} value={i + 1}>
                            {kind === "city"
                              ? `${rankName(i + 1, locale)} · ${finishName(i + 1, locale)}`
                              : tierName(i + 1, locale)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  {es ? "Logro" : "Achievement"}
                  <select
                    disabled={pending}
                    value={general}
                    onChange={(e) => {
                      setGeneral(e.target.value);
                    }}
                  >
                    <option value="">—</option>
                    {snapshot.collection.families
                      .filter(
                        (f) => !f.city_key && !f.category_key && !f.archived,
                      )
                      .map((f) => (
                        <option key={f.family_key} value={f.family_key}>
                          {f.milestones[0]?.[`title_${locale}`]}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <p>
                {es ? "Nivel real" : "Natural tier"}: {progress.natural} ·{" "}
                {es ? "Manual" : "Manual"}: {progress.manual} ·{" "}
                {es ? "Visitas o métrica real" : "Actual visits or metric"}:{" "}
                {progress.count}
              </p>
              {milestone && (
                <p>
                  {es ? "Resultado" : "Result"}:{" "}
                  {Math.max(progress.natural, milestone.tier || 1)}
                  {progress.natural > (milestone.tier || 1)
                    ? ` · ${es ? "Se mantiene el nivel ganado" : "Naturally earned tier is retained"}`
                    : ""}
                  .{" "}
                  {es
                    ? "Sustituye el nivel manual anterior. Las métricas reales no cambian."
                    : "Replaces the previous manual tier. Actual metrics stay unchanged."}
                </p>
              )}
              {family && !family.available && kind !== "general" && (
                <p>
                  {es
                    ? "Sin locales participantes actualmente. Puedes otorgarlo manualmente."
                    : "No participating venues currently. Manual grants are still available."}
                </p>
              )}
              <label>
                {es ? "Finalidad" : "Purpose"}
                <select
                  disabled={pending}
                  value={purpose}
                  onChange={(e) => {
                    setPurpose(e.target.value);
                  }}
                >
                  <option value="recognition">
                    {es ? "Reconocimiento" : "Recognition"}
                  </option>
                  <option value="test" disabled={!snapshot.test_account}>
                    {es ? "Prueba" : "Test"}
                  </option>
                </select>
              </label>
              <label>
                {es ? "Motivo obligatorio" : "Required reason"}
                <textarea
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    es
                      ? "Prueba de apariencia en móvil"
                      : "Visual check on mobile"
                  }
                />
              </label>
              <button
                disabled={pending || !milestone || reason.trim().length < 3}
                onClick={() =>
                  request(
                    "grant",
                    { achievement_key: milestone!.key, purpose },
                    `${member.email} · ${milestone![`title_${locale}`]}`,
                  )
                }
              >
                {es ? "Aplicar reconocimiento" : "Apply award"}
              </button>
              <p role="status">
                {pending ? (es ? "Guardando…" : "Saving…") : message}
              </p>
              {snapshot.test_account && (
                <>
                  <h4>
                    {es
                      ? "Presets de prueba para esta ciudad"
                      : "City test presets"}
                  </h4>
                  <select
                    disabled={pending}
                    aria-label="Preset"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                  >
                    <option value="mixed">
                      {es ? "Niveles variados" : "Mixed tiers"}
                    </option>
                    {[1, 2, 3, 4, 5].map((t) => (
                      <option key={t} value={t}>
                        {tierName(t, locale)}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={pending || reason.trim().length < 3}
                    onClick={() =>
                      request(
                        "preset",
                        { city_key: city, preset, purpose: "test" },
                        `${city} · ${preset === "mixed" ? "I, II, III, IV, V × 2" : `10 × ${tierName(Number(preset), locale)}`} · ${es ? "El rango de ciudad no cambia" : "City rank unchanged"}`,
                      )
                    }
                  >
                    {es ? "Aplicar preset" : "Apply preset"}
                  </button>
                  <button
                    disabled={pending || reason.trim().length < 3}
                    onClick={() =>
                      request(
                        "reset_city",
                        { city_key: city },
                        `${es ? "Revocar solo pruebas manuales de" : "Revoke only manual test grants in"} ${city}. ${es ? "Se conservan logros reales y reconocimientos." : "Natural awards and recognition grants remain."}`,
                      )
                    }
                  >
                    {es
                      ? "Restablecer pruebas de esta ciudad"
                      : "Reset this city’s test awards"}
                  </button>
                </>
              )}
            </section>
            <section className={styles.preview}>
              <h3>{scopes.cities.find((c) => c.key === city)?.[locale]}</h3>
              <CityStamps
                key={city + snapshot.collection.updated_at}
                city={city}
                locale={locale}
                families={snapshot.collection.families}
                signedIn={true}
              />
              <Link href={`/${locale}/passports?city=${city}`} target="_blank">
                {es
                  ? "Abrir pasaporte con la sesión actual"
                  : "Open passport using current signed-in account"}{" "}
                ↗
              </Link>
              <p>
                {es
                  ? "Para probar otro usuario, abre su sesión en otro navegador."
                  : "To test another member, open their session in another browser."}
              </p>
            </section>
          </div>
          <section className={styles.history}>
            <h3>{es ? "Historial de concesiones" : "Grant history"}</h3>
            <div className={styles.historyControls}>
              <label>
                {es ? "Ciudad" : "City"}
                <select
                  disabled={pending}
                  value={historyCity}
                  onChange={(e) => historyPage(1, e.target.value, historyState)}
                >
                  <option value="">
                    {es ? "Todas las ciudades" : "All cities"}
                  </option>
                  <option value="general">
                    {es ? "Logros generales" : "General achievements"}
                  </option>
                  {scopes.cities.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {es ? "Estado" : "Status"}
                <select
                  disabled={pending}
                  value={historyState}
                  onChange={(e) => historyPage(1, historyCity, e.target.value)}
                >
                  <option value="all">{es ? "Todos" : "All statuses"}</option>
                  <option value="active">{es ? "Activos" : "Active"}</option>
                  <option value="replaced">
                    {es ? "Sustituidos" : "Replaced"}
                  </option>
                  <option value="revoked">
                    {es ? "Revocados" : "Revoked"}
                  </option>
                </select>
              </label>
              <label>
                {es ? "Motivo para los cambios" : "Reason for changes"}
                <input
                  value={reason}
                  maxLength={500}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    es ? "Obligatorio para revocar" : "Required to revoke"
                  }
                />
              </label>
            </div>
            <p role="status">
              {pending ? (es ? "Actualizando…" : "Updating…") : message}
            </p>
            {!snapshot.grants.length && (
              <p>{es ? "Sin concesiones manuales." : "No manual grants."}</p>
            )}
            <div className={styles.historyGrid}>
              {snapshot.grants.map((g) => (
                <article key={g.id}>
                  <div className={styles.grantHeading}>
                    <span className={styles.grantIcon} aria-hidden="true">
                      {g.category_key
                        ? stampSymbols[g.category_key] || "✦"
                        : g.city_key
                          ? "◈"
                          : "★"}
                    </span>
                    <strong>{g[`title_${locale}`]}</strong>
                  </div>
                  <p>
                    {g.purpose} ·{" "}
                    {new Date(g.granted_at).toLocaleString(locale)}{" "}
                  </p>
                  <details>
                    <summary>{es ? "Ver motivo" : "View reason"}</summary>
                    <p>{g.reason}</p>
                  </details>
                  <span className={styles.grantStatus}>
                    {g.superseded_by
                      ? es
                        ? "Sustituido"
                        : "Replaced"
                      : g.revoked_at
                        ? es
                          ? "Revocado"
                          : "Revoked"
                        : es
                          ? "Activo"
                          : "Active"}
                  </span>
                  {!g.revoked_at && (
                    <>
                      <button
                        disabled={pending || reason.trim().length < 3}
                        onClick={() =>
                          request(
                            "revoke",
                            { grant_id: g.id },
                            `${es ? "Revocar" : "Revoke"} ${g[`title_${locale}`]}. ${es ? "Se mantiene cualquier nivel real o concesión restante." : "Any natural or remaining manual tier is retained."}`,
                          )
                        }
                      >
                        {es ? "Revocar" : "Revoke"}
                      </button>
                      {g.purpose === "test" && (
                        <button
                          disabled={pending || reason.trim().length < 3}
                          onClick={() =>
                            request(
                              "reset_batch",
                              { batch_id: g.batch_id },
                              `${es ? "Revocar lote de pruebas" : "Revoke test batch"} ${g.batch_id}`,
                            )
                          }
                        >
                          {es ? "Quitar lote" : "Remove batch"}
                        </button>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
            <nav
              className={styles.pagination}
              aria-label={es ? "Páginas del historial" : "History pages"}
            >
              <button
                disabled={pending || (snapshot.grants_page || 1) <= 1}
                onClick={() => historyPage((snapshot.grants_page || 1) - 1)}
              >
                {es ? "Anterior" : "Previous"}
              </button>
              <span>
                {es ? "Página" : "Page"} {snapshot.grants_page || 1} /{" "}
                {Math.max(
                  1,
                  Math.ceil(
                    (snapshot.grants_total ?? snapshot.grants.length) / 15,
                  ),
                )}{" "}
                · {snapshot.grants_total ?? snapshot.grants.length}{" "}
                {es ? "registros" : "records"}
              </span>
              <button
                disabled={
                  pending ||
                  (snapshot.grants_page || 1) * 15 >=
                    (snapshot.grants_total ?? snapshot.grants.length)
                }
                onClick={() => historyPage((snapshot.grants_page || 1) + 1)}
              >
                {es ? "Siguiente" : "Next"}
              </button>
            </nav>
          </section>
        </>
      )}
    </div>
  );
}
