import Image from "next/image";
import styles from "../account-personal.module.css";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { accountProfileWebsiteHref } from "@/lib/account-profile-website";
import { updateAccountProfile, uploadProfileMedia } from "../actions";
import { AccountPageHeader } from "../AccountPageHeader";
import { AccountCollectionState } from "../AccountCollectionState";

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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "display_name,preferred_locale,username,bio,avatar_url,banner_url,public_email,phone,website_url,instagram_url,locality,province,birth_year,gender,profile_visibility,contact_visibility,attendance_visibility",
    )
    .eq("id", user.id)
    .maybeSingle();
  const es = locale === "es";
  const instagramHandle = instagramHandleFromUrl(profile?.instagram_url);
  const websiteHref = accountProfileWebsiteHref(profile?.website_url);
  const profileVisibility =
    profile?.profile_visibility === "public"
      ? es
        ? "Visible para todos"
        : "Visible to everyone"
      : profile?.profile_visibility === "members"
        ? es
          ? "Visible para usuarios de AkiPasa"
          : "Visible to AkiPasa members"
        : es
          ? "Solo tú puedes ver este perfil"
          : "Only you can see this profile";
  const header = (
    <AccountPageHeader
      eyebrow={es ? "Identidad" : "Identity"}
      title={es ? "Perfil" : "Profile"}
      description={
        es
          ? "Tu perfil compartido de AkiSuite. Los cambios aparecen en los cinco productos."
          : "Your shared AkiSuite profile. Changes appear across all five products."
      }
    />
  );

  if (profileError) {
    return (
      <div
        className={`account-controls-page account-profile-screen ${styles.editor}`}
      >
        {header}
        <AccountCollectionState
          locale={locale}
          icon="person"
          title={
            es ? "Tu perfil no está disponible" : "Your profile is unavailable"
          }
          description={
            es
              ? "No pudimos cargar tus datos. Reintenta antes de hacer cambios."
              : "We couldn’t load your details. Try again before making changes."
          }
          failed
        />
      </div>
    );
  }

  return (
    <div
      className={`account-controls-page account-profile-screen ${styles.editor}`}
    >
      {header}

      {query.updated && (
        <p className="notice" role="status">
          {es ? "Perfil actualizado." : "Profile updated."}
        </p>
      )}
      {query.error && (
        <p className="notice" role="alert">
          {es ? "No se pudo actualizar." : "Update failed."}
        </p>
      )}

      <div className="account-profile-layout">
        <section
          className="account-profile-media account-control-card"
          aria-labelledby="profile-photos-title"
        >
          <div className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="person" />
            </span>
            <div>
              <h2 id="profile-photos-title">
                {es ? "Fotos del perfil" : "Profile photos"}
              </h2>
              <p>{es ? "Tu imagen en AkiPasa." : "Your look on AkiPasa."}</p>
            </div>
          </div>
          <div className="account-profile-preview">
            {profile?.banner_url && (
              <Image
                src={profile.banner_url}
                alt={es ? "Tu portada" : "Your cover photo"}
                width={480}
                height={160}
                unoptimized
                className="account-profile-cover"
              />
            )}
            <div className="account-profile-identity">
              <span className="account-profile-avatar">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={es ? "Tu foto de perfil" : "Your profile photo"}
                    width={64}
                    height={64}
                    unoptimized
                  />
                ) : (
                  <Icon name="person" />
                )}
              </span>
              <div>
                <strong>
                  {profile?.display_name || (es ? "Tu perfil" : "Your profile")}
                </strong>
                {profile?.username && <small>@{profile.username}</small>}
                <span
                  className="account-profile-visibility"
                  aria-label={
                    es ? "Visibilidad del perfil" : "Profile visibility"
                  }
                >
                  {profileVisibility}
                </span>
              </div>
            </div>
          </div>
          <div className="account-profile-uploads">
            <details className="account-control-disclosure">
              <summary>
                <span>
                  {es ? "Foto de perfil" : "Profile photo"}
                  <small>
                    {profile?.avatar_url
                      ? es
                        ? "Cambiar foto"
                        : "Change photo"
                      : es
                        ? "Añadir foto"
                        : "Add photo"}
                  </small>
                </span>
              </summary>
              <form
                action={uploadProfileMedia}
                className="account-profile-upload account-disclosure-content"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value="avatar" />
                <label>
                  <span>{es ? "Elegir foto" : "Choose photo"}</span>
                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <button className="button secondary" type="submit">
                  {es ? "Guardar" : "Save"}
                </button>
              </form>
            </details>
            <details className="account-control-disclosure">
              <summary>
                <span>
                  {es ? "Portada" : "Cover photo"}
                  <small>
                    {profile?.banner_url
                      ? es
                        ? "Cambiar portada"
                        : "Change cover"
                      : es
                        ? "Añadir portada"
                        : "Add cover"}
                  </small>
                </span>
              </summary>
              <form
                action={uploadProfileMedia}
                className="account-profile-upload account-disclosure-content"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="kind" value="banner" />
                <label>
                  <span>{es ? "Elegir portada" : "Choose cover"}</span>
                  <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <button className="button secondary" type="submit">
                  {es ? "Guardar" : "Save"}
                </button>
              </form>
            </details>
          </div>
          <p className="account-control-help">
            {es
              ? "JPG, PNG o WebP · hasta 10 MB por foto."
              : "JPG, PNG or WebP · up to 10 MB per photo."}
          </p>
        </section>

        <form action={updateAccountProfile} className="account-profile-form">
          <input type="hidden" name="locale" value={locale} />

          <section className="account-control-card">
            <div className="account-control-heading">
              <span className="account-control-icon">
                <Icon name="account" />
              </span>
              <div>
                <h2>{es ? "Así te verán" : "How people see you"}</h2>
                <p>
                  {es
                    ? "Nombre, usuario y una pequeña presentación."
                    : "Your name, username, and a short introduction."}
                </p>
              </div>
            </div>

            <div className="account-control-fields">
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
                <div className="account-prefixed-input">
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

            <label className="account-profile-bio">
              <span>{es ? "Sobre ti" : "About you"}</span>
              <textarea
                name="bio"
                defaultValue={profile?.bio || ""}
                maxLength={2000}
                placeholder={
                  es
                    ? "Cuéntale a la gente un poco sobre ti..."
                    : "Tell people a little about yourself..."
                }
              />
              <small>
                {es ? "Máximo 2000 caracteres." : "Up to 2000 characters."}
              </small>
            </label>
          </section>

          <details className="account-control-disclosure">
            <summary>
              <span>
                {es ? "Contacto y redes" : "Contact and social"}
                <small>
                  {es
                    ? "Email, teléfono, web e Instagram · opcional"
                    : "Email, phone, website and Instagram · optional"}
                </small>
              </span>
            </summary>

            <div className="account-control-fields account-disclosure-content">
              <label>
                {es ? "Email público" : "Public email"}
                <input
                  name="publicEmail"
                  type="email"
                  defaultValue={profile?.public_email || ""}
                  placeholder={es ? "hola@ejemplo.com" : "hello@example.com"}
                />
              </label>
              <label>
                {es ? "Teléfono" : "Phone"}
                <input name="phone" defaultValue={profile?.phone || ""} />
              </label>
              <label>
                {es ? "Tu web" : "Your website"}
                <div className="account-profile-link-field">
                  <input
                    name="websiteUrl"
                    defaultValue={profile?.website_url || ""}
                    placeholder={es ? "tusitio.com" : "yourwebsite.com"}
                    inputMode="url"
                  />
                  {websiteHref && (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noreferrer"
                      className="account-profile-link-button"
                    >
                      {es ? "Abrir" : "Open"}
                    </a>
                  )}
                </div>
              </label>
              <label>
                Instagram
                <div className="account-prefixed-input">
                  <span>@</span>
                  <input
                    name="instagramHandle"
                    defaultValue={instagramHandle}
                    pattern="[A-Za-z0-9._]{1,30}"
                    placeholder={es ? "tuusuario" : "yourusername"}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </label>
            </div>
          </details>

          <details className="account-control-disclosure">
            <summary>
              <span>
                {es ? "Tu zona" : "Your area"}
                <small>
                  {[profile?.locality, profile?.province]
                    .filter(Boolean)
                    .join(", ") ||
                    (es
                      ? "Ciudad y provincia · opcional"
                      : "City and province · optional")}
                </small>
              </span>
            </summary>
            <div className="account-control-fields account-disclosure-content">
              <label>
                {es ? "Ciudad o zona" : "City or area"}
                <input name="locality" defaultValue={profile?.locality || ""} />
              </label>
              <label>
                {es ? "Provincia" : "Province"}
                <input name="province" defaultValue={profile?.province || ""} />
              </label>
            </div>
          </details>

          <details className="account-control-disclosure">
            <summary>
              {es ? "Más sobre ti (opcional)" : "More about you (optional)"}
            </summary>
            <div className="account-control-fields account-disclosure-content">
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

          <details className="account-control-disclosure">
            <summary>
              {es ? "Privacidad del perfil" : "Profile privacy"}
            </summary>
            <div className="account-disclosure-content">
              <p className="account-control-help">
                {es
                  ? "Controla quién puede ver tu perfil, tus datos de contacto y tus eventos."
                  : "Choose who can see your profile, contact details and attended events."}
              </p>
              <div className="account-control-fields account-profile-privacy-fields">
                <label>
                  {es ? "Perfil" : "Profile"}
                  <select
                    name="profileVisibility"
                    defaultValue={profile?.profile_visibility || "public"}
                  >
                    <option value="public">
                      {es ? "Todo el mundo" : "Everyone"}
                    </option>
                    <option value="members">
                      {es ? "Usuarios de AkiPasa" : "AkiPasa users"}
                    </option>
                    <option value="private">
                      {es ? "Solo yo" : "Only me"}
                    </option>
                  </select>
                </label>
                <label>
                  {es ? "Contacto" : "Contact"}
                  <select
                    name="contactVisibility"
                    defaultValue={profile?.contact_visibility || "private"}
                  >
                    <option value="public">
                      {es ? "Todo el mundo" : "Everyone"}
                    </option>
                    <option value="members">
                      {es ? "Usuarios de AkiPasa" : "AkiPasa users"}
                    </option>
                    <option value="private">
                      {es ? "Solo yo" : "Only me"}
                    </option>
                  </select>
                </label>
                <label>
                  {es ? "Eventos asistidos" : "Attended events"}
                  <select
                    name="attendanceVisibility"
                    defaultValue={profile?.attendance_visibility || "private"}
                  >
                    <option value="public">
                      {es ? "Todo el mundo" : "Everyone"}
                    </option>
                    <option value="members">
                      {es ? "Usuarios de AkiPasa" : "AkiPasa users"}
                    </option>
                    <option value="private">
                      {es ? "Solo yo" : "Only me"}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </details>

          <div className="account-profile-save">
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
            <button
              className="button account-profile-save-button"
              type="submit"
            >
              {es ? "Guardar cambios" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
