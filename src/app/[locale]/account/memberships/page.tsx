import { redirect } from "next/navigation";

export default async function MembershipRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale === "en" ? "en" : "es"}/account/subscription`);
}
