import { notFound } from "next/navigation";
import {
  WorkspaceShell,
  type WorkspaceItem,
} from "@/components/WorkspaceShell";
import { ConsoleSwitcher } from "@/components/ConsoleSwitcher";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { canModerate } from "@/lib/roles";

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale, `/${locale}/staff`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !canModerate(profile.app_role)) notFound();
  const es = locale === "es";
  const base = `/${locale}/staff`;
  const items: WorkspaceItem[] = [
    { href: base, label: es ? "Operaciones" : "Operations", icon: "home" },
    {
      href: `${base}/support`,
      label: es ? "Soporte" : "Customer support",
      icon: "inbox",
    },
    {
      href: `${base}/moderation`,
      label: es ? "Moderación" : "Moderation",
      icon: "shield",
    },
    {
      href: `${base}/catalogue`,
      label: es ? "Locales y eventos" : "Venues and events",
      icon: "venue",
    },
    {
      href: `${base}/promotions`,
      label: es ? "Promociones" : "Promotions",
      icon: "megaphone",
    },
    {
      href: `${base}/audit`,
      label: es ? "Auditoría" : "Audit history",
      icon: "audit",
    },
  ];
  return (
    <WorkspaceShell
      title={es ? "Operaciones" : "Operations"}
      eyebrow={es ? "Espacio de staff" : "Staff workspace"}
      description={
        es
          ? "Colas, casos y catálogo. Abre solo la tarea que necesitas."
          : "Queues, cases and catalogue. Open only the task you need."
      }
      homeHref={base}
      items={items}
      switcher={
        <ConsoleSwitcher locale={locale} role={profile.app_role} active="staff" />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
