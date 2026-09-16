import fs from "node:fs";

// A source contract for the September redesign. A successful build must not
// silently switch back to the pre-redesign discovery/business routes.
const required = [
  ["src/app/[locale]/page.tsx", "<CityDiscovery"],
  ["src/components/CityDiscovery.tsx", "city-discovery-title"],
  ["src/app/globals.css", '"./discovery-redesign.css"'],
  ["src/app/[locale]/business/venue/[id]/page.tsx", "<VenueDashboard"],
];
for (const [file, marker] of required) {
  if (!fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(marker)) {
    throw new Error(
      `Release source is missing the current site: ${file} (${marker})`,
    );
  }
}
console.log("Current discovery and business layouts are present.");
