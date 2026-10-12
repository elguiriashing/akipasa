import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";
import { AccountPageHeader } from "../AccountPageHeader";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const { data, error } = await supabase
    .from("followed_venue_refs")
    .select("venue_key,name,href,created_at")
    .order("created_at", { ascending: false });
  const es = locale === "es";
  return (
    <>
      <AccountPageHeader
        eyebrow={es ? "Conexiones" : "Connections"}
        title={es ? "Locales seguidos" : "Followed venues"}
        description={
          es
            ? "Tus locales favoritos, siempre a mano."
            : "Keep your favourite venues close."
        }
        actions={
          <Link className="button secondary" href={`/${locale}`}>
            <Icon name="discover" size={17} />
            {es ? "Explorar locales" : "Explore venues"}
          </Link>
        }
      />
      <AccountItems
        locale={locale}
        kind="following"
        failed={Boolean(error)}
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
