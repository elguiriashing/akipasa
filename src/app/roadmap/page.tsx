import { permanentRedirect } from "next/navigation";

/** Public, shareable launch roadmap URL. Localized content lives under /es and /en. */
export default function RoadmapShortcut() {
  permanentRedirect("/es/roadmap");
}
