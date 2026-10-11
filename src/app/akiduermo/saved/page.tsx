import { headers } from "next/headers";
import { AkiDuermo } from "@/components/AkiDuermo";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { optionalUser } from "@/lib/auth";
import { queueSuitePortalWelcome } from "@/lib/suite-welcome";
export const metadata = {
  title: "Saved stays · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function SavedStaysPage() {
  const locale = stayLocale((await headers()).get("x-akipasa-locale"));
  const { user } = await optionalUser();
  if (user) await queueSuitePortalWelcome("akiduermo", locale);
  return <AkiDuermo initialLocale={locale} initialView="saved" />;
}
