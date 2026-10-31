import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { config } from "@/lib/config";
import { previewAccess } from "@/lib/pals/server";
import { WorldExplorer } from "@/components/pals/WorldExplorer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "AkiPals World | Private prototype",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AkiPalsWorldPage() {
  // The prototype is not linked to public navigation and cannot be rendered
  // to a guest or an account outside the existing AkiPals preview allowlist.
  const access = await previewAccess();
  if (!access.user) redirect("/en/auth?next=%2Fpals%2Fworld");
  if (!access.allowed) notFound();

  return <WorldExplorer styleUrl={config.mapStyleUrl} />;
}
