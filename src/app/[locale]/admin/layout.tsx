import { notFound } from "next/navigation";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale, `/${locale}/admin`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  const { count: pendingApplications } = await supabase
    .from("business_applications")
    .select("*", { count: "exact", head: true })
    .in("state", ["submitted", "under_review", "awaiting_payment"]);
  const es = locale === "es";
  const base = `/${locale}/admin`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Resumen" : "Overview", icon: "home" },
    {
      href: `${base}/promotions`,
      label: es ? "Solicitudes comerciales" : "Commercial requests",
      icon: "megaphone",
    },
    {
      href: `${base}/users`,
      label: es ? "Usuarios y roles" : "Users and roles",
      icon: "users",
    },
    {
      href: `${base}/business-applications`,
      label: es ? "Solicitudes de negocio" : "Business applications",
      icon: "business",
      count: pendingApplications || undefined,
    },
    {
      href: `${base}/ai-team`,
      label: es ? "Equipo de IA" : "AI Team",
      icon: "activity",
    },
    {
      href: `${base}/personalisation`,
      label: es ? "Personalización" : "Personalisation",
      icon: "activity",
    },
    {
      href: `${base}/privacy`,
      label: es ? "Privacidad" : "Privacy requests",
      icon: "lock",
    },
    {
      href: `${base}/catalogue`,
      label: es ? "Catálogo" : "Catalogue",
      icon: "venue",
    },
    {
      href: `${base}/passports`,
      label: es ? "Pasaportes" : "Passports",
      icon: "gift",
    },
    {
      href: `${base}/settings`,
      label: es ? "Configuración" : "Platform settings",
      icon: "settings",
    },
    {
      href: `${base}/audit`,
      label: es ? "Auditoría" : "Audit history",
      icon: "audit",
    },
  ];
  return (
    <WorkspaceShell
      title={es ? "Administración" : "Administration"}
      eyebrow={es ? "Control de plataforma" : "Platform control"}
      description={
        es
          ? "Gobernanza, accesos y configuración con flujos separados."
          : "Governance, access and settings in focused workflows."
      }
      homeHref={base}
      items={items}
    >
      {children}
    </WorkspaceShell>
  );
}
