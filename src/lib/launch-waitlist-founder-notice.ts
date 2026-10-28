/** Founder-only operational notice after a successful, unique email confirmation.
 * Never notify on unverified form attempts, retries or verification replays. */
export type ConfirmedWaitlistEntry = {
  id: string;
  product: "duermo" | "coches";
  full_name: string;
  email: string;
  city: string;
  audience: "person" | "business";
  interests: string;
  locale: "es" | "en";
  verified_at: string;
  marketing_consent_at: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] || char);
}

export function founderWaitlistEmail(entry: ConfirmedWaitlistEntry) {
  const name = entry.product === "duermo" ? "AkiDuermo" : "AkiCoches";
  const label = entry.audience === "business" ? "Business / Negocio" : "Individual / Particular";
  const subject = `[${name}] New verified launch signup · ${entry.city}`;
  const fields = [
    ["Name / Nombre", entry.full_name],
    ["Email", entry.email],
    ["Area / Zona", entry.city],
    ["Audience / Perfil", label],
    ["Interests / Intereses", entry.interests || "Not provided"],
    ["Language / Idioma", entry.locale.toUpperCase()],
    ["Marketing consent", entry.marketing_consent_at ? "Yes (separate opt-in)" : "No"],
  ];
  const rows = fields.map(([label, value]) =>
    `<tr><td style="padding:12px 16px;color:#95a1b6;border-bottom:1px solid #253045">${escapeHtml(label)}</td><td style="padding:12px 16px;color:#f6f8fd;border-bottom:1px solid #253045;font-weight:600">${escapeHtml(value)}</td></tr>`
  ).join("");
  const html = `<!doctype html><html><body style="margin:0;padding:30px 14px;background:#0b1220;font-family:Arial,Helvetica,sans-serif;color:#f6f8fd"><main style="max-width:590px;margin:auto;background:#151d2d;border:1px solid #334155;border-radius:22px;overflow:hidden"><div style="padding:28px;background:linear-gradient(135deg,#ff6716,#bd3b34);color:#101727"><div style="font-size:13px;font-weight:800;letter-spacing:2px">AKIPASA · LAUNCH INTEREST</div><h1 style="font-size:27px;margin:12px 0 0">New verified signup</h1></div><div style="padding:26px"><p style="color:#c3cbd9;line-height:1.5">Someone confirmed their email for <strong style="color:#fff">${name}</strong>. This is an operational notification, not marketing permission.</p><table style="width:100%;border-collapse:collapse;text-align:left;font-size:14px">${rows}</table><p style="margin-top:24px;color:#95a1b6;font-size:12px">Verified ${escapeHtml(entry.verified_at)} · Reference ${escapeHtml(entry.id)}<br>For internal use only. Do not add this contact to promotional lists without separate consent.</p></div></main></body></html>`;
  const text = [subject, "", ...fields.map(([k, v]) => `${k}: ${v}`), `Verified: ${entry.verified_at}`, `Reference: ${entry.id}`, "Internal operations only. Marketing consent is separate."].join("\n");
  return { subject, html, text };
}

export async function sendFounderWaitlistNotice(
  entry: ConfirmedWaitlistEntry,
  resendKey: string,
  send: typeof fetch = fetch,
): Promise<boolean> {
  const message = founderWaitlistEmail(entry);
  const response = await send("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendKey,
      "Content-Type": "application/json",
      "Idempotency-Key": "launch-founders-" + entry.id,
    },
    body: JSON.stringify({
      from: "AkiPasa <support@akipasa.com>",
      to: ["alex@akipasa.com", "andrew@akipasa.com"],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  return response.ok;
}
