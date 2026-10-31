import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { akiSuiteMembershipReturnPath } from "@/lib/akisuite-catalogue";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import "./account-suite.css";
import "./account-controls.css";
import "./account-collections.css";
import "./account-consumer.css";
import { AccountSectionLinks } from "./AccountSectionLinks";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    akiSuiteMembershipReturnPath(
      locale,
      (await headers()).get("x-akipasa-membership-next"),
    ),
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,app_role,membership_tier")
    .eq("id", user.id)
    .maybeSingle();
  const es = locale === "es";
  const base = `/${locale}/account`;
  const items: WorkspaceItem[] = [
    ...(process.env.AKISUITE_REFERRALS_READY === "true"
      ? [
          {
            href: `/${locale}/account/referrals`,
            label: es ? "Recomendaciones" : "Referrals",
            icon: "gift" as const,
          },
        ]
      : []),
    { href: base, label: es ? "Mi perfil" : "My profile", icon: "home" },
    { href: `${base}/saved`, label: es ? "Guardados" : "Saved", icon: "saved" },
    {
      href: `${base}/following`,
      label: es ? "Siguiendo" : "Following",
      icon: "venue",
    },
    {
      href: `${base}/bookings`,
      label: es ? "Mis reservas" : "My bookings",
      icon: "calendar",
    },
    {
      href: `${base}/activity`,
      label: es ? "Actividad" : "Activity",
      icon: "activity",
    },
    ...(profile?.membership_tier === "premium"
      ? [
          {
            href: `${base}/premium`,
            label: "Premium",
            icon: "gift" as const,
          },
        ]
      : []),
    {
      href: `${base}/profile`,
      label: es ? "Editar perfil" : "Edit profile",
      icon: "person",
    },
    {
      href: `${base}/settings`,
      label: es ? "Ajustes" : "Settings",
      icon: "settings",
    },
    {
      href: `${base}/privacy`,
      label: es ? "Privacidad" : "Privacy",
      icon: "lock",
    },
    {
      href: `${base}/subscription`,
      label: es ? "Membresía" : "Membership",
      icon: "gift",
    },
  ];
  return (
    <div className="pasa-consumer-account">
      <WorkspaceShell
        title={profile?.display_name || (es ? "Tu cuenta" : "Your account")}
        navigationTitle={es ? "Tu cuenta" : "Your account"}
        eyebrow={es ? "Cuenta AkiPasa" : "AkiPasa account"}
        description={
          es
            ? "Tus planes, reservas y preferencias."
            : "Your plans, bookings and preferences."
        }
        homeHref={base}
        items={items}
        hidePageHeading
      >
        <AccountSectionLinks locale={locale} />
        {children}
      </WorkspaceShell>
    </div>
  );
}
