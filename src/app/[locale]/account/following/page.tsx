import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountItems } from "../AccountItems";
import { AccountPageHeader } from "../AccountPageHeader";
import { currentVenueCollectionItems } from "@/lib/account-collection-catalogue";
import {
  accountCollectionPage,
  accountCollectionPageSize,
  accountCollectionQuery,
} from "@/lib/account-collection-query";

export default async function FollowingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale);
  const query = (await searchParams) || {};
  const search = accountCollectionQuery(query.q);
  const page = accountCollectionPage(query.page);
  const from = (page - 1) * accountCollectionPageSize;
  let collectionQuery = supabase
    .from("followed_venue_refs")
    .select("venue_key,name,href,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("venue_key", { ascending: true });
  if (search) collectionQuery = collectionQuery.ilike("name", `%${search}%`);
  const { data, error, count } = await collectionQuery.range(
    from,
    from + accountCollectionPageSize - 1,
  );
  if (!error && count && from >= count) {
    const lastPage = Math.ceil(count / accountCollectionPageSize);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (lastPage > 1) params.set("page", String(lastPage));
    redirect(
      `/${locale}/account/following?${params.toString()}`.replace(/\?$/, ""),
    );
  }
  const items = error
    ? []
    : await currentVenueCollectionItems(supabase, data || [], locale);
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
      {query.collection === "removed" && (
        <p className="notice" role="status">
          {es ? "Has dejado de seguir el local." : "Venue unfollowed."}
        </p>
      )}
      {query.collection === "error" && (
        <p className="notice" role="alert">
          {es
            ? "No se ha podido dejar de seguir el local. Vuelve a intentarlo."
            : "The venue could not be unfollowed. Please try again."}
        </p>
      )}
      <AccountItems
        locale={locale}
        kind="following"
        failed={Boolean(error)}
        total={count ?? 0}
        page={page}
        pageSize={accountCollectionPageSize}
        query={search}
        basePath={`/${locale}/account/following`}
        items={items.map((item) => ({
          id: item.venue_key,
          label: item.displayLabel,
          href: item.displayHref,
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
