import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { rentalCategoryLabels } from "@/lib/akiconduzco";
import { suiteHref } from "@/lib/suite-navigation";
import { SpainAddressAutocomplete } from "@/components/SpainAddressAutocomplete";
import styles from "@/components/AkiConduzco.module.css";
import desk from "./mobility-desk.module.css";
import {
  createRentalBlock,
  createRentalCompany,
  createRentalVehicle,
  updateRentalBookingStatus,
  updateRentalVehicle,
} from "./actions";

type Vehicle = {
  id: string;
  name: string;
  category: keyof typeof rentalCategoryLabels;
  transmission: string;
  fuel: string;
  seats: number;
  luggage: number;
  daily_price_cents: number;
  deposit_cents: number;
  active: boolean;
};
type Booking = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  note: string | null;
  quoted_total_cents: number;
  vehicle: { name: string } | Array<{ name: string }> | null;
};
type Block = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string;
};

export default async function MobilityWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  const rentalHref = suiteHref("coches", locale);
  const bookingLabels: Record<string, string> = es
    ? {
        requested: "Pendiente",
        confirmed: "Confirmada",
        declined: "Rechazada",
        cancelled: "Cancelada",
        completed: "Completada",
      }
    : {
        requested: "Requested",
        confirmed: "Confirmed",
        declined: "Declined",
        cancelled: "Cancelled",
        completed: "Completed",
      };
  const query = await searchParams;
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const { data: company, error: companyError } = await supabase
    .from("car_rental_companies")
    .select(
      "id,name,slug,city,address,latitude,longitude,phone,website_url,status,created_at",
    )
    .eq("submitted_by", user.id)
    .maybeSingle();
  let vehicles: Vehicle[] = [];
  let vehicleError = false;
  let bookings: Booking[] = [];
  let bookingError = false;
  let blocks: Block[] = [];
  let blockError = false;
  if (company) {
    const [vehicleResult, bookingResult] = await Promise.all([
      supabase
        .from("car_rental_vehicles")
        .select(
          "id,name,category,transmission,fuel,seats,luggage,daily_price_cents,deposit_cents,active",
        )
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("car_rental_bookings")
        .select(
          "id,vehicle_id,start_date,end_date,status,contact_name,contact_email,contact_phone,note,quoted_total_cents,vehicle:car_rental_vehicles!inner(name,company_id)",
        )
        .eq("vehicle.company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    vehicles = (vehicleResult.data || []) as Vehicle[];
    vehicleError = Boolean(vehicleResult.error);
    bookings = (bookingResult.data || []) as unknown as Booking[];
    bookingError = Boolean(bookingResult.error);
    if (vehicles.length) {
      const blockResult = await supabase
        .from("car_rental_calendar_blocks")
        .select("id,vehicle_id,start_date,end_date,reason")
        .in(
          "vehicle_id",
          vehicles.map((item) => item.id),
        )
        .order("start_date")
        .limit(200);
      blocks = (blockResult.data || []) as Block[];
      blockError = Boolean(blockResult.error);
    }
  }
  const status =
    company?.status === "published"
      ? es
        ? "Publicado"
        : "Published"
      : company?.status === "pending_review"
        ? es
          ? "Pendiente de revisión"
          : "Pending review"
        : company?.status === "paused"
          ? es
            ? "Pausado"
            : "Paused"
          : company?.status === "rejected"
            ? es
              ? "Rechazado"
              : "Rejected"
            : es
              ? "Estado no disponible"
              : "Status unavailable";
  return (
    <div className={`${styles.business} ${desk.desk}`}>
      <main className={styles.businessMain}>
        <header className={styles.businessHeader}>
          <div>
            <Link href={`/${locale}/business`} className={desk.back}>
              ← {es ? "Mis negocios" : "My businesses"}
            </Link>
            <span className={desk.eyebrow}>AkiCoches</span>
            <h1>{es ? "Tu operación de alquiler" : "Your rental desk"}</h1>
            <p>
              {es
                ? "Panel de alquiler · flota, disponibilidad y solicitudes"
                : "Rental desk · fleet, availability and requests"}
            </p>
          </div>
          <Link className={styles.button} href={rentalHref}>
            {es ? "Ver AkiCoches" : "View AkiCoches"}
          </Link>
        </header>
        <p className={desk.boundary}>
          {es
            ? "Gestiona tu empresa sin reclamar un local. Las solicitudes requieren confirmación; esta pantalla no cobra pagos."
            : "Manage your company without claiming a venue. Requests require confirmation; this screen does not take payments."}
        </p>
        {company && (
          <nav
            className={styles.businessNav}
            aria-label={es ? "Herramientas de alquiler" : "Rental tools"}
          >
            <a href="#overview">{es ? "Resumen" : "Overview"}</a>
            <a href="#fleet">{es ? "Flota" : "Fleet"}</a>
            <a href="#availability">{es ? "Disponibilidad" : "Availability"}</a>
            <a href="#bookings">{es ? "Solicitudes" : "Requests"}</a>
          </nav>
        )}
        {(query.error ||
          companyError ||
          (company && (vehicleError || bookingError))) && (
          <p className={styles.error} role="alert">
            {es
              ? "No se pudo cargar o guardar toda la información. Reintenta antes de gestionar reservas."
              : "Some information failed to load or save. Retry before managing rental requests."}
          </p>
        )}
        {query.created && (
          <p className={styles.notice} role="status">
            {query.created === "company"
              ? es
                ? "Empresa enviada a revisión. Puedes preparar la flota ahora."
                : "Company sent for review. You can prepare your fleet now."
              : query.created === "vehicle"
                ? es
                  ? "Vehículo añadido."
                  : "Vehicle added."
                : es
                  ? "Disponibilidad actualizada."
                  : "Availability updated."}
          </p>
        )}
        {query.updated && (
          <p className={styles.notice} role="status">
            {es ? "Cambios guardados." : "Changes saved."}
          </p>
        )}
        {!company && !companyError && (
          <section className={styles.businessCard} style={{ marginTop: 22 }}>
            <h2>
              {es
                ? "Registra tu empresa de alquiler"
                : "Set up your rental company"}
            </h2>
            <p>
              {es
                ? "Crea tu propia ficha y envíala a revisión. No tienes que reclamar ningún local de AkiPasa."
                : "Create your own company profile and submit it for review. You do not need to claim an AkiPasa venue."}
            </p>
            <form action={createRentalCompany}>
              <input type="hidden" name="locale" value={locale} />
              <label>
                {es ? "Nombre de la empresa" : "Company name"}
                <input name="name" required minLength={2} maxLength={120} />
              </label>
              <div className="form-grid-two">
                <SpainAddressAutocomplete
                  locale={locale}
                  mode="address"
                  label={es ? "Dirección de recogida" : "Pick-up address"}
                />
                <SpainAddressAutocomplete
                  locale={locale}
                  mode="locality"
                  name="city"
                  label={es ? "Ciudad" : "City"}
                />
              </div>
              <label>
                {es ? "Teléfono (opcional)" : "Phone (optional)"}
                <input name="phone" type="tel" maxLength={40} />
              </label>
              <label>
                {es ? "Web segura (opcional)" : "Secure website (optional)"}
                <input name="website" type="url" placeholder="https://" />
              </label>
              <button type="submit">
                {es ? "Enviar empresa a revisión" : "Submit company for review"}
              </button>
            </form>
          </section>
        )}
        {company && (
          <>
            <section className={styles.businessIntro} id="overview">
              <div>
                <span className={styles.eyebrow}>
                  {es ? "Tu operación" : "Your operation"}
                </span>
                <strong>{company.name}</strong>
                <p>
                  {company.address} · {company.city}
                </p>
              </div>
              <span
                className={`${styles.status} ${company.status === "published" ? styles.statusLive : ""}`}
              >
                {status}
              </span>
              <p>
                {company.status === "pending_review"
                  ? es
                    ? "Tu ficha está pendiente de revisión. Mientras tanto, puedes preparar vehículos y precios."
                    : "Your profile is awaiting review. You can prepare vehicles and prices meanwhile."
                  : company.status === "published"
                    ? es
                      ? "Tu ficha está aprobada. Su visibilidad pública depende de la disponibilidad del producto AkiCoches."
                      : "Your profile is approved. Public visibility depends on the AkiCoches product rollout."
                    : es
                      ? "La ficha no está visible al público. Contacta con soporte si necesitas ayuda."
                      : "Your company is not visible publicly. Contact support if you need help."}
              </p>
            </section>
            <div className={styles.businessStats}>
              <a href="#fleet">
                <strong>{vehicleError ? "—" : vehicles.length}</strong>
                <span>{es ? "Vehículos" : "Vehicles"}</span>
              </a>
              <a href="#fleet">
                <strong>
                  {vehicleError ? "—" : vehicles.filter((v) => v.active).length}
                </strong>
                <span>{es ? "Visibles" : "Active listings"}</span>
              </a>
              <a href="#bookings">
                <strong>
                  {bookingError
                    ? "—"
                    : bookings.filter((b) => b.status === "requested").length}
                </strong>
                <span>{es ? "Por responder" : "Awaiting reply"}</span>
              </a>
              <a href="#availability">
                <strong>
                  {blockError || vehicleError ? "—" : blocks.length}
                </strong>
                <span>{es ? "Bloqueos" : "Date blocks"}</span>
              </a>
            </div>
            <p className={desk.sample}>
              {es
                ? "Resumen de los registros cargados: hasta 100 vehículos, 100 solicitudes y 200 bloqueos."
                : "Summary of loaded records: up to 100 vehicles, 100 requests and 200 date blocks."}
            </p>
            <div className={`${styles.businessGrid} ${desk.workspaceGrid}`}>
              <section className={styles.businessCard}>
                <h2>{es ? "Añadir vehículo" : "Add vehicle"}</h2>
                <form action={createRentalVehicle}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="companyId" value={company.id} />
                  <label>
                    {es ? "Nombre visible" : "Listing name"}
                    <input
                      name="name"
                      required
                      maxLength={120}
                      placeholder="Toyota Yaris"
                    />
                  </label>
                  <label>
                    {es ? "Categoría" : "Category"}
                    <select name="category" defaultValue="economy">
                      {Object.entries(rentalCategoryLabels).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label[locale]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {es ? "Transmisión" : "Transmission"}
                    <select name="transmission">
                      <option value="manual">{es ? "Manual" : "Manual"}</option>
                      <option value="automatic">
                        {es ? "Automático" : "Automatic"}
                      </option>
                    </select>
                  </label>
                  <label>
                    {es ? "Combustible" : "Fuel"}
                    <select name="fuel">
                      <option value="petrol">
                        {es ? "Gasolina" : "Petrol"}
                      </option>
                      <option value="diesel">{es ? "Diésel" : "Diesel"}</option>
                      <option value="hybrid">
                        {es ? "Híbrido" : "Hybrid"}
                      </option>
                      <option value="electric">
                        {es ? "Eléctrico" : "Electric"}
                      </option>
                      <option value="other">{es ? "Otro" : "Other"}</option>
                    </select>
                  </label>
                  <div className="form-grid-two">
                    <label>
                      {es ? "Plazas" : "Seats"}
                      <input
                        name="seats"
                        type="number"
                        min="2"
                        max="9"
                        defaultValue="5"
                        required
                      />
                    </label>
                    <label>
                      {es ? "Maletas" : "Bags"}
                      <input
                        name="luggage"
                        type="number"
                        min="0"
                        max="12"
                        defaultValue="2"
                        required
                      />
                    </label>
                  </div>
                  <div className="form-grid-two">
                    <label>
                      {es ? "Precio por día (€)" : "Daily price (€)"}
                      <input
                        name="dailyPrice"
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        required
                      />
                    </label>
                    <label>
                      {es ? "Fianza (€)" : "Deposit (€)"}
                      <input
                        name="deposit"
                        type="number"
                        min="0"
                        max="50000"
                        step="1"
                        defaultValue="0"
                        required
                      />
                    </label>
                  </div>
                  <button type="submit">
                    {es ? "Añadir a la flota" : "Add to fleet"}
                  </button>
                </form>
              </section>
              <section className={styles.businessCard} id="fleet">
                <h2>
                  {es ? "Tu flota" : "Your fleet"} ·{" "}
                  {vehicleError ? "—" : vehicles.length}
                </h2>
                <span id="availability" className={desk.anchor} />
                {vehicleError ? (
                  <p role="alert">
                    {es
                      ? "No se pudo cargar la flota."
                      : "Fleet could not be loaded."}
                  </p>
                ) : vehicles.length ? (
                  <div className={styles.fleetList}>
                    {vehicles.map((vehicle) => (
                      <article
                        className={styles.businessCard}
                        key={vehicle.id}
                        style={{ padding: 12 }}
                      >
                        <div>
                          <strong>{vehicle.name}</strong>
                          <small>
                            {rentalCategoryLabels[vehicle.category]?.[locale] ||
                              vehicle.category}{" "}
                            · {vehicle.seats} {es ? "plazas" : "seats"} · €
                            {Math.round(vehicle.daily_price_cents / 100)} /{" "}
                            {es ? "día" : "day"}
                          </small>
                          <span
                            className={`${styles.status} ${vehicle.active ? styles.statusLive : ""}`}
                          >
                            {vehicle.active
                              ? es
                                ? "Activo"
                                : "Active"
                              : es
                                ? "Oculto"
                                : "Hidden"}
                          </span>
                        </div>
                        <form
                          action={updateRentalVehicle}
                          className="form-grid-two"
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="companyId"
                            value={company.id}
                          />
                          <input
                            type="hidden"
                            name="vehicleId"
                            value={vehicle.id}
                          />
                          <label>
                            {es ? "Precio/día €" : "Daily €"}
                            <input
                              name="dailyPrice"
                              type="number"
                              min="1"
                              step="1"
                              defaultValue={Math.round(
                                vehicle.daily_price_cents / 100,
                              )}
                              required
                            />
                          </label>
                          <label>
                            {es ? "Fianza €" : "Deposit €"}
                            <input
                              name="deposit"
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={Math.round(
                                vehicle.deposit_cents / 100,
                              )}
                              required
                            />
                          </label>
                          <label>
                            {es ? "Visibilidad" : "Visibility"}
                            <select
                              name="active"
                              defaultValue={String(vehicle.active)}
                            >
                              <option value="true">
                                {es ? "Activo" : "Active"}
                              </option>
                              <option value="false">
                                {es ? "Oculto" : "Hidden"}
                              </option>
                            </select>
                          </label>
                          <button type="submit">
                            {es ? "Guardar" : "Save"}
                          </button>
                        </form>
                        <form
                          action={createRentalBlock}
                          className="form-grid-two"
                        >
                          <input type="hidden" name="locale" value={locale} />
                          <input
                            type="hidden"
                            name="companyId"
                            value={company.id}
                          />
                          <input
                            type="hidden"
                            name="vehicleId"
                            value={vehicle.id}
                          />
                          <label>
                            {es ? "No disponible desde" : "Unavailable from"}
                            <input type="date" name="start" required />
                          </label>
                          <label>
                            {es ? "Hasta (sin incluir)" : "Until (exclusive)"}
                            <input type="date" name="end" required />
                          </label>
                          <button type="submit">
                            {es ? "Bloquear fechas" : "Block dates"}
                          </button>
                        </form>
                        <div>
                          {blocks
                            .filter((block) => block.vehicle_id === vehicle.id)
                            .map((block) => (
                              <small
                                key={block.id}
                                style={{ display: "block" }}
                              >
                                {block.start_date} → {block.end_date} ·{" "}
                                {block.reason === "booking"
                                  ? es
                                    ? "alquiler confirmado"
                                    : "confirmed rental"
                                  : es
                                    ? "bloqueo"
                                    : "blocked"}{" "}
                              </small>
                            ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    {es
                      ? "Añade tu primer vehículo a la flota."
                      : "Add your first rental vehicle to get started."}
                  </p>
                )}
                {blockError && (
                  <p role="alert">
                    {es
                      ? "No se pudieron cargar todas las fechas bloqueadas."
                      : "Some unavailable dates could not be loaded."}
                  </p>
                )}
              </section>
            </div>
            <section
              className={styles.businessCard}
              style={{ marginTop: 16 }}
              id="bookings"
            >
              <h2>{es ? "Solicitudes de alquiler" : "Rental requests"}</h2>
              {bookingError ? (
                <p role="alert">
                  {es
                    ? "No se pudieron cargar solicitudes."
                    : "Rental requests could not be loaded."}
                </p>
              ) : !bookings.length ? (
                <p>
                  {es ? "Aún no hay solicitudes." : "No rental requests yet."}
                </p>
              ) : (
                <div className={styles.fleetList}>
                  {bookings.map((booking) => {
                    const vehicle = Array.isArray(booking.vehicle)
                      ? booking.vehicle[0]
                      : booking.vehicle;
                    return (
                      <article className={styles.businessCard} key={booking.id}>
                        <strong>
                          {vehicle?.name || (es ? "Vehículo" : "Vehicle")} ·{" "}
                          {booking.contact_name}
                        </strong>
                        <p>
                          {booking.start_date} → {booking.end_date} ·{" "}
                          {booking.contact_email}
                          {booking.contact_phone
                            ? ` · ${booking.contact_phone}`
                            : ""}
                        </p>
                        {booking.note && <p>{booking.note}</p>}
                        <span className={styles.status}>
                          {bookingLabels[booking.status] ||
                            (es
                              ? "Estado no disponible"
                              : "Status unavailable")}
                        </span>
                        {booking.status === "requested" && (
                          <div className={styles.tools}>
                            <form action={updateRentalBookingStatus}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <button name="status" value="confirmed">
                                {es ? "Confirmar" : "Confirm"}
                              </button>
                            </form>
                            <form action={updateRentalBookingStatus}>
                              <input
                                type="hidden"
                                name="locale"
                                value={locale}
                              />
                              <input
                                type="hidden"
                                name="bookingId"
                                value={booking.id}
                              />
                              <button name="status" value="declined">
                                {es ? "Rechazar" : "Decline"}
                              </button>
                            </form>
                          </div>
                        )}
                        {booking.status === "confirmed" && (
                          <form action={updateRentalBookingStatus}>
                            <input type="hidden" name="locale" value={locale} />
                            <input
                              type="hidden"
                              name="bookingId"
                              value={booking.id}
                            />
                            <button name="status" value="completed">
                              {es ? "Marcar completada" : "Mark complete"}
                            </button>
                            <button name="status" value="cancelled">
                              {es ? "Cancelar" : "Cancel"}
                            </button>
                          </form>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
        <footer className={styles.footer}>
          <span>
            {es
              ? "AkiCoches · gestión de alquiler"
              : "AkiCoches · rental management"}
          </span>
          <Link href={rentalHref}>
            {es ? "Ver experiencia de clientes" : "View customer experience"}
          </Link>
        </footer>
      </main>
    </div>
  );
}
