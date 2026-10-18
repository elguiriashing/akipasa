import { publicPageMetadata } from "@/lib/page-metadata";
import { notFound } from "next/navigation";
import { SuitePricingExperience } from "@/components/SuitePricingExperience";
import { personalPremiumVisible } from "@/lib/akisuite-rollout";
import { isLocale } from "@/lib/config";

export const generateMetadata = publicPageMetadata("/membership");
export const dynamic = "force-dynamic";

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <SuitePricingExperience
      locale={locale}
      product="akipasa"
      personalUnlocked={await personalPremiumVisible()}
    />
  );
}
