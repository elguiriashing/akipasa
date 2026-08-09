import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const { data } = await supabase
    .from("followed_venue_refs")
    .select("venue_key,name,href,created_at")
    .order("created_at", { ascending: false });
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Conexiones" : "Connections"}
        title={es ? "Locales seguidos" : "Followed venues"}
        description={
          es
            ? "Negocios de los que quieres recibir novedades."
            : "Businesses you want to keep up with."
        }
      />
      <AccountItems
        locale={locale}
        items={(data || []).map((item) => ({
          id: item.venue_key,
          label: item.name,
          href: item.href,
          date: item.created_at,
        }))}
        emptyTitle={es ? "Aún no sigues locales" : "No followed venues"}
        emptyDescription={
          es
            ? "Sigue un local desde su página para encontrarlo aquí."
            : "Follow a venue from its page to find it here."
        }
      />
    </>
  );
}
