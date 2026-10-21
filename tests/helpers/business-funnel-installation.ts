import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const directory = "database/deployments/trusted-business-funnel/";
export type FunnelManifest = {
  sources: { path: string; sha256: string }[];
  phases: { id: string; file: string; sha256: string; bytes: number }[];
};
export function verifiedFunnelPhases() {
  const manifest = JSON.parse(
    readFileSync(directory + "manifest.json", "utf8"),
  ) as FunnelManifest;
  for (const source of manifest.sources) {
    if (
      createHash("sha256").update(readFileSync(source.path)).digest("hex") !==
      source.sha256
    )
      throw new Error("Canonical migration digest mismatch");
  }
  return manifest.phases.map((phase) => {
    const sql = readFileSync(directory + phase.file, "utf8");
    if (
      createHash("sha256").update(sql).digest("hex") !== phase.sha256 ||
      Buffer.byteLength(sql) !== phase.bytes
    )
      throw new Error("Deployment phase digest mismatch");
    return { ...phase, sql };
  });
}
export function readBusinessFunnelInstallation() {
  return process.env.AKISUITE_FUNNEL_SQL_MODE === "phased"
    ? verifiedFunnelPhases()
        .filter((phase) => phase.id !== "11")
        .map((phase) => phase.sql)
        .join("\n")
    : readFileSync(
        "supabase/migrations/20261020234414_trusted_business_funnel.sql",
        "utf8",
      );
}
