import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { updateAccountProfile, uploadProfileMedia } from "../actions";

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

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Identidad" : "Identity"}
        title={es ? "Perfil" : "Profile"}
        description={
          es
            ? "La información que usas dentro de AkiPasa."
            : "The information you use inside AkiPasa."
        }
      />
      {query.updated && (
        <p className="notice">
          {es ? "Perfil actualizado." : "Profile updated."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es ? "No se pudo actualizar." : "Update failed."}
        </p>
      )}
      <section className="panel profile-media-manager">
        <h2>{es ? "Fotos del perfil" : "Profile media"}</h2>
        <p>
          {es
            ? "Sube JPG, PNG o WebP de hasta 10 MB. Se sincroniza con tu pagina de creador."
            : "Upload a JPG, PNG or WebP up to 10 MB. It syncs with your creator page."}
        </p>
        <div className="two-col">
          <form action={uploadProfileMedia} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="avatar" />
            <label>
              {es ? "Foto de perfil" : "Profile photo"}
              <input
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <button className="button secondary" type="submit">
              {es ? "Subir foto" : "Upload photo"}
            </button>
          </form>
          <form action={uploadProfileMedia} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="banner" />
            <label>
              {es ? "Imagen de portada" : "Profile banner"}
              <input
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <button className="button secondary" type="submit">
              {es ? "Subir portada" : "Upload banner"}
            </button>
          </form>
        </div>
      </section>
      <form action={updateAccountProfile} className="panel stack focused-form">
        <input type="hidden" name="locale" value={locale} />
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
          {es ? "Usuario" : "Username"}
          <input
            name="username"
            defaultValue={profile?.username || ""}
            pattern="[A-Za-z0-9_]{3,30}"
          />
        </label>
        <label>
          {es ? "Biografia" : "Biography"}
          <textarea
            name="bio"
            defaultValue={profile?.bio || ""}
            maxLength={2000}
          />
        </label>
        <div className="form-grid-two">
          <label>
            {es ? "Foto (URL HTTPS)" : "Photo (HTTPS URL)"}
            <input
              name="avatarUrl"
              type="url"
              defaultValue={profile?.avatar_url || ""}
            />
          </label>
          <label>
            {es ? "Banner (URL HTTPS)" : "Banner (HTTPS URL)"}
            <input
              name="bannerUrl"
              type="url"
              defaultValue={profile?.banner_url || ""}
            />
          </label>
        </div>
        <div className="form-grid-two">
          <label>
            {es ? "Email publico" : "Public email"}
            <input
              name="publicEmail"
              type="email"
              defaultValue={profile?.public_email || ""}
            />
          </label>
          <label>
            {es ? "Telefono" : "Phone"}
            <input name="phone" defaultValue={profile?.phone || ""} />
          </label>
        </div>
        <div className="form-grid-two">
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
        <div className="form-grid-two">
          <label>
            {es ? "Zona" : "Area"}
            <input name="locality" defaultValue={profile?.locality || ""} />
          </label>
          <label>
            {es ? "Provincia" : "Province"}
            <input name="province" defaultValue={profile?.province || ""} />
          </label>
        </div>
        <div className="form-grid-two">
          <label>
            {es ? "Ano de nacimiento (opcional)" : "Birth year (optional)"}
            <input
              name="birthYear"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              defaultValue={profile?.birth_year || ""}
            />
          </label>
          <label>
            {es ? "Genero (opcional)" : "Gender (optional)"}
            <input name="gender" defaultValue={profile?.gender || ""} />
          </label>
        </div>
        <div className="form-grid-three">
          <label>
            {es ? "Perfil" : "Profile"}
            <select
              name="profileVisibility"
              defaultValue={profile?.profile_visibility || "public"}
            >
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>
            {es ? "Contacto" : "Contact"}
            <select
              name="contactVisibility"
              defaultValue={profile?.contact_visibility || "private"}
            >
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>
            {es ? "Eventos asistidos" : "Attended events"}
            <select
              name="attendanceVisibility"
              defaultValue={profile?.attendance_visibility || "private"}
            >
              <option value="public">Public</option>
              <option value="members">Members</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>
        <label>
          Email
          <input value={user.email || ""} readOnly disabled />
          <small>
            {es
              ? "El email se gestiona con tu método de acceso."
              : "Email is managed by your sign-in method."}
          </small>
        </label>
        <label>
          {es ? "Idioma preferido" : "Preferred language"}
          <select
            name="preferredLocale"
            defaultValue={profile?.preferred_locale || locale}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <button className="button" type="submit">
          {es ? "Guardar perfil" : "Save profile"}
        </button>
      </form>
    </>
  );
}
