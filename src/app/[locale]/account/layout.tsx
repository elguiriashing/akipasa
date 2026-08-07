import { notFound } from "next/navigation";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { ConsoleSwitcher } from "@/components/ConsoleSwitcher";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,app_role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.app_role || "consumer";
  const es = locale === "es";
  const base = `/${locale}/account`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Resumen" : "Overview", icon: "home" },
    {
      href: `${base}/subscription`,
      label: es ? "Membresía" : "Membership",
      icon: "gift",
    },
    {
      href: `${base}/profile`,
      label: es ? "Perfil" : "Profile",
      icon: "person",
    },
    {
      href: `${base}/saved`,
      label: es ? "Eventos guardados" : "Saved events",
      icon: "saved",
    },
    {
      href: `${base}/following`,
      label: es ? "Locales seguidos" : "Followed venues",
      icon: "venue",
    },
    {
      href: `${base}/rewards`,
      label: es ? "Pasaportes y premios" : "Passports and rewards",
      icon: "gift",
    },
    {
      href: `${base}/activity`,
      label: es ? "Actividad" : "Activity",
      icon: "activity",
    },
    {
      href: `${base}/privacy`,
      label: es ? "Privacidad y datos" : "Privacy and data",
      icon: "lock",
    },
    {
      href: `${base}/settings`,
      label: es ? "Ajustes" : "Settings",
      icon: "settings",
    },
  ];

  return (
    <WorkspaceShell
      title={profile?.display_name || (es ? "Tu cuenta" : "Your account")}
      eyebrow={es ? "Cuenta AkiPasa" : "AkiPasa account"}
      description={
        es
          ? "Tus planes, progreso y datos, organizados por tarea."
          : "Your plans, progress and data, organised by task."
      }
      homeHref={base}
      items={items}
      switcher={<ConsoleSwitcher locale={locale} role={role} active="account" />}
    >
      {children}
    </WorkspaceShell>
  );
}
