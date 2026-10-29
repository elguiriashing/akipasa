import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { referralCode } from "@/lib/referrals";
import { captureReferral } from "../account/referrals/actions";

/** Public referral landing. A code never grants access or rewards by itself. */
export default async function ReferralLanding({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const code = referralCode((await searchParams).ref);
  if (!code) notFound();
  const es = locale === "es";
  const ready = process.env.AKISUITE_REFERRALS_READY === "true";

  if (!ready)
    return (
      <main className="shell pasa-referral-entry">
        <section className="pasa-conversion-hero">
          <span className="pasa-conversion-kicker">AKISUITE / {es ? "RECOMENDACIONES" : "REFERRALS"}</span>
          <h1>{es ? "Las recomendaciones están en preparación" : "Referrals are being prepared"}</h1>
          <p>
            {es
              ? "Todavía no puedes aplicar códigos ni conseguir descuentos o comisiones. Te avisaremos cuando el programa esté disponible."
              : "Codes cannot be applied yet, and discounts or commissions are not active. The programme will be announced when it is available."}
          </p>
          <span className="pasa-conversion-status" role="status">
            {es ? "Programa no activo" : "Programme not active"}
          </span>
        </section>
        <section className="pasa-conversion-panel" aria-labelledby="referral-next-steps">
          <h2 id="referral-next-steps">
            {es ? "Mientras tanto, sigue explorando" : "Keep exploring in the meantime"}
          </h2>
          <p>
            {es
              ? "AkiPasa sigue disponible sin un código. No necesitas activar una recomendación para descubrir locales y planes."
              : "You can still discover venues and plans on AkiPasa without a referral code."}
          </p>
          <Link className="pasa-conversion-link" href={`/${locale}`}>
            {es ? "Volver a AkiPasa" : "Back to AkiPasa"} <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </main>
    );

  await requireUser(locale, `/${locale}/referrals?ref=${code}`);
  return (
    <main className="shell pasa-referral-entry">
      <section className="pasa-conversion-hero">
        <span className="pasa-conversion-kicker">AKISUITE / {es ? "RECOMENDACIONES" : "REFERRALS"}</span>
        <h1>{es ? "Guarda tu recomendación" : "Save your referral"}</h1>
        <p>
          {es
            ? "Confirma el código que te han compartido. Se vinculará una sola vez a tu cuenta AkiSuite."
            : "Confirm the code someone shared with you. It can be linked once to your AkiSuite account."}
        </p>
        <span className="pasa-conversion-status">
          {es ? "Sin descuentos ni recompensas monetarias activas" : "No active discounts or monetary rewards"}
        </span>
      </section>
      <form action={captureReferral} className="pasa-conversion-panel pasa-referral-confirmation">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="product" value="akipasa" />
        <input type="hidden" name="code" value={code} />
        <span className="pasa-referral-code-label">
          {es ? "Tu código de recomendación" : "Your referral code"}
        </span>
        <strong className="pasa-referral-code">{code}</strong>
        <p>
          {es
            ? "Confirmar no activa pagos, descuentos ni premios. Tu atribución solo se registra si la cuenta cumple las condiciones."
            : "Confirmation does not activate payments, discounts or prizes. Attribution is recorded only if your account is eligible."}
        </p>
        <div className="pasa-conversion-actions">
          <button className="pasa-conversion-submit" type="submit">
            {es ? "Confirmar recomendación" : "Confirm referral"}
          </button>
          <Link className="pasa-conversion-secondary" href={`/${locale}/account`}>
            {es ? "Continuar sin aplicar" : "Continue without applying"}
          </Link>
        </div>
      </form>
    </main>
  );
}
