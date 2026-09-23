import type { Metadata } from "next";
import { AkiDuermo } from "@/components/AkiDuermo";
export const metadata: Metadata = {
  title: { absolute: "AkiDuermo · A good day deserves a great stay" },
  description:
    "Find hotels, rural escapes, apartments and places to stay across Spain. An early preview from AkiPasa.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://akiduermo.akipasa.com" },
};
export default function AkiDuermoPage() {
  return <AkiDuermo />;
}
