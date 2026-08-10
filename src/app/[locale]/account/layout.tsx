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
    .select("display_name,app_role,membership_tier")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.app_role || "consumer";
  const es = locale === "es";
  const base = `/${locale}/account`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Resumen" : "Overview", icon: "home" },
    { href: `${base}/saved`, label: es ? "Guardados" : "Saved", icon: "saved" },
    {
      href: `${base}/rewards`,
      label: es ? "Progreso" : "Progress",
      icon: "gift",
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
      label: es ? "Perfil" : "Profile",
      icon: "person",
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
      switcher={
        <ConsoleSwitcher locale={locale} role={role} active="account" />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
