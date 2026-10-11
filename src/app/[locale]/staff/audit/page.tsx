import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";

/** Legacy Staff audit links cannot expose the privileged Admin log. */
export default async function StaffAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(locale, `/${locale}/staff/audit`);
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !isAdministrator(profile.app_role)) notFound();
  redirect(`/${locale}/admin/audit`);
}
