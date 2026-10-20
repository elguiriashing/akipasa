"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { referralCode } from "@/lib/referrals";
export function ReferralInvitation({ locale }: { locale: "en" | "es" }) {
  const query = useSearchParams();
  const path = usePathname();
  const values = query.getAll("ref");
  const code = values.length === 1 ? referralCode(values[0]) : null;
  if (!code || /\/(?:referrals|auth|terms)(?:\/|$)/.test(path)) return null;
  return (
    <aside
      aria-label={
        locale === "es" ? "Recomendación de AkiSuite" : "AkiSuite referral"
      }
      className="shell"
      style={{
        padding: "1rem",
        border: "1px solid currentColor",
        borderRadius: "1rem",
        marginBlock: "1rem",
      }}
    >
      <p>
        {locale === "es"
          ? "Has seguido un enlace de recomendación de AkiSuite."
          : "You followed an AkiSuite referral link."}
      </p>
      <Link href={`/${locale}/referrals?ref=${code}`}>
        {locale === "es"
          ? "Guardar recomendación en mi cuenta"
          : "Save referral to my account"}
      </Link>
    </aside>
  );
}
