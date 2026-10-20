import { notFound } from "next/navigation";
import { isLocale } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { referralCode } from "@/lib/referrals";
import { captureReferral } from "../account/referrals/actions";
import "../account/referrals/referrals.css";
/** Public auth return surface: account layouts must not replace a referral destination. */
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
  if (process.env.AKISUITE_REFERRALS_READY !== "true")
    return (
      <main>
        <h1>
          {locale === "es"
            ? "Recomendaciones de AkiSuite"
            : "AkiSuite referrals"}
        </h1>
        <p>
          {locale === "es"
            ? "El programa todavía no está disponible."
            : "The programme is not available yet."}
        </p>
      </main>
    );
  await requireUser(locale, `/${locale}/referrals?ref=${code}`);
  return (
    <main className="referral-workspace">
      <h1>{locale === "es" ? "Guardar recomendación" : "Save referral"}</h1>
      <p>
        {locale === "es"
          ? "Este código se vinculará una sola vez a tu cuenta compartida de AkiSuite. No activa descuentos ni recompensas monetarias."
          : "This code will be linked once to your shared AkiSuite account. It does not activate discounts or monetary rewards."}
      </p>
      <form action={captureReferral}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="product" value="akipasa" />
        <input type="hidden" name="code" value={code} />
        <strong>{code}</strong>
        <button>
          {locale === "es" ? "Confirmar recomendación" : "Confirm referral"}
        </button>
        <a href={`/${locale}/account`}>
          {locale === "es"
            ? "Continuar sin aplicar"
            : "Continue without applying"}
        </a>
      </form>
    </main>
  );
}
