type Confirmation = {
  recipient: string;
  audience: "customer" | "venue";
  bookingId: string;
  venueName: string;
  customerName: string;
  guestCount: number;
  bookingStart: string | null;
  customerEmail: string;
  locale: "en" | "es";
};

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] || char,
  );

/** Transactional sending only; booking approval persists independently of provider availability. */
export async function sendBookingConfirmationEmail(
  data: Confirmation,
): Promise<{ ok: boolean; messageId?: string }> {
  const token = process.env.RESEND_API_KEY;
  if (!token) return { ok: false };
  // Only the auth subdomain is currently verified on the connected sending service.
  const from =
    process.env.BOOKING_EMAIL_FROM ||
    "AkiPasa Bookings <bookings@auth.akipasa.com>";
  const es = data.locale === "es";
  const when = data.bookingStart
    ? new Date(data.bookingStart).toLocaleString(es ? "es-ES" : "en-GB", {
        timeZone: "Europe/Madrid",
        dateStyle: "full",
        timeStyle: "short",
      })
    : es
      ? "Por confirmar"
      : "To be confirmed";
  const title = es ? "Reserva confirmada" : "Booking confirmed";
  const subject =
    data.audience === "venue"
      ? es
        ? `Nueva reserva confirmada · ${data.venueName}`
        : `New confirmed booking · ${data.venueName}`
      : `${title} · ${data.venueName}`;
  const intro =
    data.audience === "venue"
      ? es
        ? "Se ha confirmado una reserva para tu local."
        : "A booking at your venue has been confirmed."
      : es
        ? `Hola ${data.customerName}, tu reserva está confirmada.`
        : `Hi ${data.customerName}, your booking is confirmed.`;
  const detail = [
    [es ? "Local" : "Venue", data.venueName],
    [es ? "Fecha y hora" : "Date & time", when],
    [es ? "Personas" : "Guests", String(data.guestCount)],
    ...(data.audience === "venue"
      ? [
          [es ? "Contacto" : "Contact", data.customerName],
          ["Email", data.customerEmail],
        ]
      : []),
    [es ? "Referencia" : "Reference", data.bookingId.slice(0, 8).toUpperCase()],
  ];
  const text = [
    intro,
    "",
    ...detail.map(([a, b]) => `${a}: ${b}`),
    "",
    "AkiPasa · akipasa.com",
  ].join("\n");
  const html = `<!doctype html><html><body style="background:#0f1326;margin:0;padding:28px;font-family:Arial,sans-serif;color:#edf2ff"><div style="max-width:580px;margin:auto;background:#1b2540;padding:32px;border-radius:20px"><p style="font-weight:bold;color:#fb9a50">AKIPASA</p><h1 style="font-size:27px">${escapeHtml(title)}</h1><p>${escapeHtml(intro)}</p><div style="background:#101a30;border-radius:14px;padding:20px">${detail.map(([a, b]) => `<p style="margin:8px 0"><span style="color:#aab8d2">${escapeHtml(a)}:</span> <strong>${escapeHtml(b)}</strong></p>`).join("")}</div><p style="color:#aab8d2;font-size:12px;margin-top:24px">AkiPasa · akipasa.com</p></div></body></html>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `akipasa-booking-${data.bookingId}-${data.audience}`,
      },
      body: JSON.stringify({ from, to: [data.recipient], subject, text, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false };
    const result = (await response.json()) as { id?: string };
    return { ok: true, messageId: result.id };
  } catch {
    return { ok: false };
  }
}
