import { headers } from "next/headers";
import { AkiDuermo } from "@/components/AkiDuermo";
import { stayLocale } from "@/lib/akiduermo-i18n";
export const metadata = {
  title: "Saved stays · AkiDuermo",
  robots: { index: false, follow: false },
};
export default async function SavedStaysPage() {
  return (
    <AkiDuermo
      initialLocale={stayLocale((await headers()).get("x-akipasa-locale"))}
      initialView="saved"
    />
  );
}
