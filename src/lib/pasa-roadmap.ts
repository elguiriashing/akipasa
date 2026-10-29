import type { Locale } from "./config";

export type LaunchPhase = {
  key: "build" | "coast" | "refine" | "expand";
  status: "current" | "next" | "planned";
  eyebrow: { en: string; es: string };
  title: { en: string; es: string };
  description: { en: string; es: string };
  schedule: { en: string; es: string };
};

export type RoadmapFeature = {
  name: string;
  label: { en: string; es: string };
  detail: { en: string; es: string };
  state: "building" | "private" | "planned";
};

export const launchPhases: readonly LaunchPhase[] = [
  {
    key: "build",
    status: "current",
    eyebrow: { en: "01 · Right now", es: "01 · Ahora mismo" },
    title: { en: "Build it properly", es: "Construirlo bien" },
    description: {
      en: "Finish the discovery experience, make the map useful, and verify real venue and event information before calling a city launched.",
      es: "Pulir la experiencia, mejorar el mapa y comprobar la información real de locales y eventos antes de dar una ciudad por estrenada.",
    },
    schedule: { en: "In development", es: "En desarrollo" },
  },
  {
    key: "coast",
    status: "next",
    eyebrow: { en: "02 · First rollout", es: "02 · Primer lanzamiento" },
    title: { en: "Costa del Sol first", es: "Primero, la Costa del Sol" },
    description: {
      en: "Start locally around Fuengirola and the Costa del Sol. Make discovery genuinely worthwhile before scaling beyond the region.",
      es: "Empezar por Fuengirola y la Costa del Sol. Conseguir que descubrir planes merezca la pena antes de llegar a otras zonas.",
    },
    schedule: { en: "Launch date to be confirmed", es: "Fecha por confirmar" },
  },
  {
    key: "refine",
    status: "planned",
    eyebrow: { en: "03 · Learn and improve", es: "03 · Escuchar y mejorar" },
    title: { en: "More reasons to return", es: "Más motivos para volver" },
    description: {
      en: "Use genuine feedback to improve Community, verified check-ins, Passport achievements and our AkiPals mascot experience.",
      es: "Usar opiniones reales para mejorar Comunidad, check-ins verificados, logros del Pasaporte y nuestros personajes AkiPals.",
    },
    schedule: {
      en: "After the first rollout",
      es: "Tras el primer lanzamiento",
    },
  },
  {
    key: "expand",
    status: "planned",
    eyebrow: { en: "04 · City by city", es: "04 · Ciudad a ciudad" },
    title: { en: "Follow the people", es: "Seguir a la gente" },
    description: {
      en: "Grow across Spain according to real interest, local community activity and reliable venue coverage, rather than publishing a made-up city calendar.",
      es: "Crecer por España según el interés real, la actividad de cada comunidad y la calidad de los locales disponibles, sin inventar un calendario.",
    },
    schedule: {
      en: "Demand-led, no fixed dates yet",
      es: "Según demanda, sin fechas cerradas",
    },
  },
];

export const roadmapFeatures: readonly RoadmapFeature[] = [
  {
    name: "Discovery + Map",
    label: { en: "Core experience", es: "Experiencia principal" },
    detail: {
      en: "Real places and plans, without the clutter.",
      es: "Lugares y planes reales, sin complicaciones.",
    },
    state: "building",
  },
  {
    name: "Venue + Event pages",
    label: { en: "Core experience", es: "Experiencia principal" },
    detail: {
      en: "Useful details before you head out.",
      es: "Lo que necesitas saber antes de salir.",
    },
    state: "building",
  },
  {
    name: "Community",
    label: { en: "Being developed", es: "En desarrollo" },
    detail: {
      en: "Discover local creators and share better plans.",
      es: "Descubre creadores y comparte planes.",
    },
    state: "building",
  },
  {
    name: "Passport",
    label: { en: "Evolving", es: "En evolución" },
    detail: {
      en: "Stamps, progress and verified achievements.",
      es: "Sellos, progreso y logros verificados.",
    },
    state: "building",
  },
  {
    name: "AkiPals",
    label: { en: "Private playtest", es: "Pruebas privadas" },
    detail: {
      en: "Virtual companions, outfits and adventures.",
      es: "Mascotas virtuales, conjuntos y aventuras.",
    },
    state: "private",
  },
  {
    name: "Friends + plans",
    label: { en: "On the horizon", es: "En el horizonte" },
    detail: {
      en: "Opt-in connections, not public location tracking.",
      es: "Conexiones voluntarias, sin rastrear ubicaciones.",
    },
    state: "planned",
  },
];

export function localized<T extends { en: string; es: string }>(
  text: T,
  locale: Locale,
): string {
  return text[locale];
}
