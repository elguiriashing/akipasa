import { headers } from "next/headers";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { StayMapPage } from "@/components/StayMapPage";
export const metadata = {
  title: "Map · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function MapPage() {
  return (
    <StayMapPage
      locale={stayLocale((await headers()).get("x-akipasa-locale"))}
    />
  );
}
