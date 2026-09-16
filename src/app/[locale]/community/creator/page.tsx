/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { communityCreatorItems } from "@/components/community/CreatorDirectoryPage";
import { uploadProfileMedia } from "../../account/actions";
import {
  requestCreatorVerification,
  saveCreatorProfile,
} from "../creator-actions";

export default async function CreatorStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("creator_profiles")
    .select(
      "slug,display_name,headline_es,headline_en,bio_es,bio_en,locality,province,avatar_url,cover_url,website_url,instagram_url,youtube_url,state,verification_state",
    )
    .eq("profile_id", user.id)
    .maybeSingle();
  const [
    { data: categories },
    { data: selectedCategories },
    { data: hostedEvents },
    { data: submittedEvents },
    { data: verificationEligibility },
  ] = await Promise.all([
    supabase.from("categories").select("id,name_es,name_en").order("name_es"),
    supabase
      .from("creator_categories")
      .select("category_id")
      .eq("creator_profile_id", user.id),
    supabase
      .from("events")
      .select("id,slug,title_es,title_en,status,created_at")
      .eq("creator_profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_submissions")
      .select("id,title,state,created_at,published_event_id")
      .eq("submitter_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("creator_verification_eligibility", {
      p_profile: user.id,
    }),
  ]);
  const eligibility = verificationEligibility as {
    eligible?: boolean;
    published_events?: number;
    participants?: number;
    required_events?: number;
    required_participants?: number;
  } | null;
  const selectedCategoryIds = new Set(
    (selectedCategories || []).map((item) => item.category_id),
  );
  return (
    <WorkspaceShell
      title={es ? "Mi perfil creador" : "Creator studio"}
      eyebrow={es ? "Comunidad" : "Community"}
      description={
        es
          ? "Gestiona tu pagina publica, categorias, eventos y solicitud de verificacion."
          : "Manage your public page, categories, events and verification request."
      }
      navigationTitle={es ? "Comunidad" : "Community"}
      homeHref={`/${locale}/community`}
      items={communityCreatorItems(locale)}
    >
      <div className="creator-studio-page">
        <section className="creator-directory-hero creator-studio-hero">
          <div>
            <span className="eyebrow">
              {es ? "Comunidad creadora" : "Creator community"}
            </span>
            <h1>{es ? "Tu estudio de creador" : "Your creator studio"}</h1>
            <p>
              {es
                ? "Construye tu escaparate y deja que tu catálogo crezca con cada evento publicado."
                : "Build your showcase and let your catalogue grow with every published event."}
            </p>
          </div>
          <div className="creator-studio-hero-actions">
            {profile?.slug && profile.state === "published" && (
              <Link
                className="button"
                href={`/${locale}/community/creators/${profile.slug}`}
              >
                {es ? "Ver página pública" : "View public page"}
              </Link>
            )}
            <span
              className={`creator-studio-status is-${profile?.state || "draft"}`}
            >
              <i aria-hidden="true" />
              {profile?.state === "published"
                ? es
                  ? "Publicado"
                  : "Published"
                : es
                  ? "Borrador"
                  : "Draft"}
            </span>
          </div>
        </section>
        {query.updated && (
          <p className="notice">
            {es ? "Perfil actualizado." : "Profile updated."}
          </p>
        )}
        {query.error === "verification-requirements" && (
          <p className="notice">
            {es
              ? "Tu perfil todavia no cumple los requisitos de verificacion. Revisa el progreso al final de esta pagina."
              : "Your profile does not meet the verification requirements yet. Review your progress at the bottom of this page."}
          </p>
        )}
        <nav
          className="creator-studio-jumpnav"
          aria-label={es ? "Secciones del estudio" : "Studio sections"}
        >
          <a href="#showcase">{es ? "Imágenes" : "Showcase"}</a>
          <a href="#profile">{es ? "Perfil" : "Profile"}</a>
          <a href="#events">{es ? "Eventos" : "Events"}</a>
        </nav>
        <section className="panel profile-media-manager" id="showcase">
          <div className="creator-studio-section-heading">
            <div>
              <span className="eyebrow">
                {es ? "Identidad visual" : "Visual identity"}
              </span>
              <h2>
                {es
                  ? "Haz que tu página sea reconocible"
                  : "Make your page unmistakably yours"}
              </h2>
            </div>
            <p>
              {es
                ? "Tu foto y portada también se sincronizan con tu perfil de cuenta."
                : "Your photo and cover stay synchronized with your account profile."}
            </p>
          </div>
          <div className="two-col">
            {(["avatar", "banner"] as const).map((kind) => (
              <form
                action={uploadProfileMedia}
                className="creator-media-upload"
                key={kind}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value={kind} />
                <input type="hidden" name="returnTo" value="creator" />
                <div className={`creator-media-preview is-${kind}`}>
                  {(
                    kind === "avatar" ? profile?.avatar_url : profile?.cover_url
                  ) ? (
                    <img
                      src={
                        (kind === "avatar"
                          ? profile?.avatar_url
                          : profile?.cover_url) || ""
                      }
                      alt=""
                    />
                  ) : (
                    <span>
                      {kind === "avatar"
                        ? (profile?.display_name || "A").slice(0, 1)
                        : "AkiPasa"}
                    </span>
                  )}
                </div>
                <label>
                  {kind === "avatar"
                    ? es
                      ? "Foto de perfil"
                      : "Profile photo"
                    : es
                      ? "Imagen de portada"
                      : "Cover image"}
                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <button className="button secondary" type="submit">
                  {es ? "Actualizar" : "Update"}
                </button>
              </form>
            ))}
          </div>
        </section>
        <form
          action={saveCreatorProfile}
          className="panel stack focused-form creator-studio-form"
          id="profile"
        >
          <div className="creator-studio-section-heading">
            <div>
              <span className="eyebrow">
                {es ? "Página pública" : "Public page"}
              </span>
              <h2>
                {es ? "Cuenta tu historia" : "Tell people what you create"}
              </h2>
            </div>
            <p>
              {es
                ? "Los campos en español e inglés permiten que tu página llegue a más personas."
                : "Spanish and English fields help your page reach more people."}
            </p>
          </div>
          <input type="hidden" name="locale" value={locale} />
          <div className="two-col">
            <label>
              {es ? "Nombre público" : "Public name"}
              <input
                name="displayName"
                required
                minLength={2}
                maxLength={100}
                defaultValue={profile?.display_name || ""}
              />
            </label>
            <label>
              Slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                defaultValue={profile?.slug || ""}
                placeholder="alex-creates"
              />
            </label>
          </div>
          <div className="two-col">
            <label>
              {es ? "Titular" : "Headline"}
              <input
                name="headlineEs"
                maxLength={180}
                defaultValue={profile?.headline_es || ""}
              />
            </label>
            <label>
              Headline (EN)
              <input
                name="headlineEn"
                maxLength={180}
                defaultValue={profile?.headline_en || ""}
              />
            </label>
          </div>
          <label>
            {es ? "Biografía" : "Biography"}
            <textarea
              name="bioEs"
              required
              minLength={40}
              maxLength={4000}
              defaultValue={profile?.bio_es || ""}
            />
          </label>
          <label>
            Biography (EN)
            <textarea
              name="bioEn"
              minLength={40}
              maxLength={4000}
              defaultValue={profile?.bio_en || ""}
            />
          </label>
          <div className="two-col">
            <label>
              {es ? "Zona" : "Area"}
              <input
                name="locality"
                maxLength={120}
                defaultValue={profile?.locality || ""}
              />
            </label>
            <label>
              {es ? "Provincia" : "Province"}
              <input
                name="province"
                maxLength={120}
                defaultValue={profile?.province || ""}
              />
            </label>
          </div>
          <div className="two-col">
            <label>
              {es ? "Foto de perfil (URL HTTPS)" : "Profile photo (HTTPS URL)"}
              <input
                name="avatarUrl"
                type="url"
                defaultValue={profile?.avatar_url || ""}
              />
            </label>
            <label>
              {es ? "Portada (URL HTTPS)" : "Cover (HTTPS URL)"}
              <input
                name="coverUrl"
                type="url"
                defaultValue={profile?.cover_url || ""}
              />
            </label>
          </div>
          <div className="two-col">
            <label>
              Website
              <input
                name="websiteUrl"
                type="url"
                defaultValue={profile?.website_url || ""}
              />
            </label>
            <label>
              Instagram
              <input
                name="instagramUrl"
                type="url"
                defaultValue={profile?.instagram_url || ""}
              />
            </label>
          </div>
          <label>
            YouTube
            <input
              name="youtubeUrl"
              type="url"
              defaultValue={profile?.youtube_url || ""}
            />
          </label>
          <fieldset className="creator-category-picker">
            <legend>
              {es ? "Categorías (hasta 6)" : "Categories (up to 6)"}
            </legend>
            <div>
              {(categories || []).map((category) => (
                <label key={category.id}>
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={category.id}
                    defaultChecked={selectedCategoryIds.has(category.id)}
                  />
                  <span>
                    {es
                      ? category.name_es
                      : category.name_en || category.name_es}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            {es ? "Visibilidad" : "Visibility"}
            <select name="publish" defaultValue={profile?.state || "draft"}>
              <option value="draft">{es ? "Borrador" : "Draft"}</option>
              <option value="published">{es ? "Público" : "Public"}</option>
            </select>
          </label>
          <button className="button button-strong" type="submit">
            {es ? "Guardar perfil" : "Save profile"}
          </button>
        </form>
        <section className="panel stack creator-event-manager" id="events">
          <div className="card-title-row">
            <div>
              <span className="eyebrow">
                {es ? "Tu programación" : "Your programme"}
              </span>
              <h2>{es ? "Mis eventos" : "My events"}</h2>
              <p>
                {es
                  ? "Gestiona tus propuestas y abre el catalogo que ya se ha publicado."
                  : "Track your submissions and open the catalogue that is already published."}
              </p>
            </div>
            <Link className="button" href={`/${locale}/community?view=suggest`}>
              {es ? "Anadir evento" : "Add event"}
            </Link>
          </div>
          <div className="managed-list">
            {(hostedEvents || []).map((event) => (
              <Link
                className="managed-row"
                key={event.id}
                href={`/${locale}/events/${event.slug}`}
              >
                <div>
                  <strong>
                    {locale === "en"
                      ? event.title_en || event.title_es
                      : event.title_es}
                  </strong>
                  <span>{es ? "Evento publicado" : "Published event"}</span>
                </div>
                <span className="status-pill">{event.status}</span>
              </Link>
            ))}
            {(submittedEvents || [])
              .filter((event) => !event.published_event_id)
              .map((event) => (
                <div className="managed-row" key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <span>
                      {new Date(event.created_at).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <span className="status-pill">{event.state}</span>
                </div>
              ))}
            {!hostedEvents?.length && !submittedEvents?.length && (
              <p className="empty-state">
                {es
                  ? "Aun no has creado ningun evento."
                  : "You have not created an event yet."}
              </p>
            )}
          </div>
        </section>
        {profile?.state === "published" &&
          !["verified", "pending"].includes(profile.verification_state) && (
            <form
              action={requestCreatorVerification}
              className="panel creator-verification-callout"
            >
              <input type="hidden" name="locale" value={locale} />
              <div>
                {eligibility && (
                  <p>
                    {es
                      ? `${eligibility.published_events || 0} de ${eligibility.required_events || 0} eventos publicados / ${eligibility.participants || 0} de ${eligibility.required_participants || 0} participantes.`
                      : `${eligibility.published_events || 0} of ${eligibility.required_events || 0} published events / ${eligibility.participants || 0} of ${eligibility.required_participants || 0} participants.`}
                  </p>
                )}
                <strong>
                  {es ? "Solicitar verificación" : "Request verification"}
                </strong>
                <p>
                  {es
                    ? "El equipo revisará identidad, historial y cumplimiento."
                    : "The team will review identity, history and compliance."}
                </p>
              </div>
              <button
                className="button"
                type="submit"
                disabled={eligibility ? !eligibility.eligible : false}
              >
                {eligibility && !eligibility.eligible
                  ? es
                    ? "Aun no disponible"
                    : "Not available yet"
                  : es
                    ? "Enviar solicitud"
                    : "Submit request"}
              </button>
            </form>
          )}
        {profile?.verification_state === "pending" && (
          <p className="notice">
            {es ? "Verificación en revisión." : "Verification is in review."}
          </p>
        )}
      </div>
    </WorkspaceShell>
  );
}
