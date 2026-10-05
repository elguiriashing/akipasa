import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { updateAccountProfile, uploadProfileMedia } from "../actions";

function instagramHandleFromUrl(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name,preferred_locale,username,bio,avatar_url,banner_url,public_email,phone,website_url,instagram_url,locality,province,birth_year,gender,profile_visibility,contact_visibility,attendance_visibility",
    )
    .eq("id", user.id)
    .maybeSingle();
  const es = locale === "es";
  const instagramHandle = instagramHandleFromUrl(profile?.instagram_url);

  return (
    <div className="account-profile-page">
      <WorkspacePageHeader
        eyebrow={es ? "Identidad" : "Identity"}
        title={es ? "Perfil" : "Profile"}
        description={
          es
            ? "Tu información pública y cómo apareces en AkiPasa."
            : "Your public information and how you appear on AkiPasa."
        }
      />

      {query.updated && (
        <p className="notice">{es ? "Perfil actualizado." : "Profile updated."}</p>
      )}
      {query.error && (
        <p className="notice">{es ? "No se pudo actualizar." : "Update failed."}</p>
      )}

      <section className="profile-media-simple" aria-labelledby="profile-photos-title">
        <div className="profile-section-heading">
          <div>
            <span>{es ? "Tu imagen" : "Your look"}</span>
            <h2 id="profile-photos-title">
              {es ? "Fotos del perfil" : "Profile photos"}
            </h2>
          </div>
          <p>
            {es
              ? "Elige una foto de perfil y una portada. Nada de enlaces raros ni tecnicismos."
              : "Choose a profile photo and a cover. No weird links or technical fields."}
          </p>
        </div>

        <div className="profile-upload-grid">
          <form action={uploadProfileMedia} className="profile-upload-card">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="avatar" />
            <div>
              <strong>{es ? "Foto de perfil" : "Profile photo"}</strong>
              <small>
                {profile?.avatar_url
                  ? es
                    ? "Foto configurada"
                    : "Photo set"
                  : es
                    ? "Aún no tienes foto"
                    : "No photo yet"}
              </small>
            </div>
            <label className="profile-file-button">
              <input
                className="profile-file-input"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <span>{es ? "Elegir foto" : "Choose photo"}</span>
            </label>
            <button className="button secondary" type="submit">
              {es ? "Guardar" : "Save"}
            </button>
          </form>

          <form action={uploadProfileMedia} className="profile-upload-card">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="banner" />
            <div>
              <strong>{es ? "Portada" : "Cover photo"}</strong>
              <small>
                {profile?.banner_url
                  ? es
                    ? "Portada configurada"
                    : "Cover set"
                  : es
                    ? "Aún no tienes portada"
                    : "No cover yet"}
              </small>
            </div>
            <label className="profile-file-button">
              <input
                className="profile-file-input"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <span>{es ? "Elegir portada" : "Choose cover"}</span>
            </label>
            <button className="button secondary" type="submit">
              {es ? "Guardar" : "Save"}
            </button>
          </form>
        </div>
      </section>

      <form action={updateAccountProfile} className="profile-simple-form">
        <input type="hidden" name="locale" value={locale} />

        <section className="profile-form-section">
          <div className="profile-section-heading compact">
            <div>
              <span>{es ? "Lo básico" : "The basics"}</span>
              <h2>{es ? "Así te verán" : "How people see you"}</h2>
            </div>
          </div>

          <div className="profile-name-grid">
            <label>
              {es ? "Nombre visible" : "Display name"}
              <input
                name="displayName"
                defaultValue={profile?.display_name || ""}
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              {es ? "Usuario de AkiPasa" : "AkiPasa username"}
              <div className="profile-prefixed-input">
                <span>@</span>
                <input
                  name="username"
                  defaultValue={profile?.username || ""}
                  pattern="[A-Za-z0-9_]{3,30}"
                  placeholder={es ? "tu_usuario" : "your_username"}
                />
              </div>
            </label>
          </div>

          <label className="profile-bio-field">
            <span>{es ? "Sobre ti" : "About you"}</span>
            <textarea
              name="bio"
              defaultValue={profile?.bio || ""}
              maxLength={300}
              placeholder={
                es
                  ? "Cuéntale a la gente un poco sobre ti..."
                  : "Tell people a little about yourself..."
              }
            />
            <small>{es ? "Máximo 300 caracteres." : "Up to 300 characters."}</small>
          </label>
        </section>

        <section className="profile-form-section">
          <div className="profile-section-heading compact">
            <div>
              <span>{es ? "Contacto" : "Contact"}</span>
              <h2>{es ? "Dónde encontrarte" : "Where to find you"}</h2>
            </div>
            <p>{es ? "Todo esto es opcional." : "Everything here is optional."}</p>
          </div>

          <div className="profile-form-grid">
            <label>
              {es ? "Email público" : "Public email"}
              <input
                name="publicEmail"
                type="email"
                defaultValue={profile?.public_email || ""}
                placeholder="hola@ejemplo.com"
              />
            </label>
            <label>
              {es ? "Teléfono" : "Phone"}
              <input name="phone" defaultValue={profile?.phone || ""} />
            </label>
            <label>
              {es ? "Tu web" : "Your website"}
              <div className="profile-link-field">
                <input
                  name="websiteUrl"
                  defaultValue={profile?.website_url || ""}
                  placeholder="tusitio.com"
                  inputMode="url"
                />
                {profile?.website_url && (
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-link-button"
                  >
                    {es ? "Abrir" : "Open"}
                  </a>
                )}
              </div>
            </label>
            <label>
              Instagram
              <div className="profile-prefixed-input">
                <span>@</span>
                <input
                  name="instagramHandle"
                  defaultValue={instagramHandle}
                  pattern="[A-Za-z0-9._]{1,30}"
                  placeholder="tuusuario"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="profile-form-section">
          <div className="profile-section-heading compact">
            <div>
              <span>{es ? "Ubicación" : "Location"}</span>
              <h2>{es ? "Tu zona" : "Your area"}</h2>
            </div>
          </div>
          <div className="profile-form-grid">
            <label>
              {es ? "Ciudad o zona" : "City or area"}
              <input name="locality" defaultValue={profile?.locality || ""} />
            </label>
            <label>
              {es ? "Provincia" : "Province"}
              <input name="province" defaultValue={profile?.province || ""} />
            </label>
          </div>
        </section>

        <details className="profile-optional-section">
          <summary>{es ? "Más sobre ti (opcional)" : "More about you (optional)"}</summary>
          <div className="profile-form-grid">
            <label>
              {es ? "Año de nacimiento" : "Birth year"}
              <input
                name="birthYear"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                defaultValue={profile?.birth_year || ""}
              />
            </label>
            <label>
              {es ? "Género" : "Gender"}
              <input name="gender" defaultValue={profile?.gender || ""} />
            </label>
          </div>
        </details>

        <details className="profile-optional-section">
          <summary>{es ? "Privacidad del perfil" : "Profile privacy"}</summary>
          <p className="profile-detail-help">
            {es
              ? "Controla quién puede ver tu perfil, tus datos de contacto y tus eventos."
              : "Choose who can see your profile, contact details and attended events."}
          </p>
          <div className="profile-form-grid profile-privacy-grid">
            <label>
              {es ? "Perfil" : "Profile"}
              <select
                name="profileVisibility"
                defaultValue={profile?.profile_visibility || "public"}
              >
                <option value="public">{es ? "Todo el mundo" : "Everyone"}</option>
                <option value="members">{es ? "Usuarios de AkiPasa" : "AkiPasa users"}</option>
                <option value="private">{es ? "Solo yo" : "Only me"}</option>
              </select>
            </label>
            <label>
              {es ? "Contacto" : "Contact"}
              <select
                name="contactVisibility"
                defaultValue={profile?.contact_visibility || "private"}
              >
                <option value="public">{es ? "Todo el mundo" : "Everyone"}</option>
                <option value="members">{es ? "Usuarios de AkiPasa" : "AkiPasa users"}</option>
                <option value="private">{es ? "Solo yo" : "Only me"}</option>
              </select>
            </label>
            <label>
              {es ? "Eventos asistidos" : "Attended events"}
              <select
                name="attendanceVisibility"
                defaultValue={profile?.attendance_visibility || "private"}
              >
                <option value="public">{es ? "Todo el mundo" : "Everyone"}</option>
                <option value="members">{es ? "Usuarios de AkiPasa" : "AkiPasa users"}</option>
                <option value="private">{es ? "Solo yo" : "Only me"}</option>
              </select>
            </label>
          </div>
        </details>

        <div className="profile-save-row">
          <label>
            {es ? "Idioma" : "Language"}
            <select
              name="preferredLocale"
              defaultValue={profile?.preferred_locale || locale}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <button className="button profile-save-button" type="submit">
            {es ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
