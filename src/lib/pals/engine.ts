/** Server-authoritative, deterministic-with-context rules for the restricted AkiPals preview. */
export type Stat = "wits" | "energy" | "charm";
export type Slot = "head" | "body" | "back" | "held";
export type Family =
  | "brasa"
  | "moka"
  | "tapo"
  | "lux"
  | "musa"
  | "lupa"
  | "rayo"
  | "nube"
  | "chispa"
  | "brote";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export const STATS: Stat[] = ["wits", "energy", "charm"];
export const SLOTS: Slot[] = ["head", "body", "back", "held"];
export const DAY = 86400000;
export const MAX_INVENTORY = 80;
export const MAX_ACTIVE_MODULES = 6;
export const MAX_LEVEL = 10;
export const families: {
  id: Family;
  name: string;
  category: string;
  colour: string;
  light: string;
  personality: string;
  master: string[];
}[] = [
  {
    id: "brasa",
    name: "Brasa",
    category: "Restaurants",
    colour: "#ff8c4b",
    light: "#ffd89a",
    personality: "Tiny flame. Unreasonably big dinner plans.",
    master: ["chef-hat", "chef-coat", "brewer-pack", "gold-pan"],
  },
  {
    id: "moka",
    name: "Moka",
    category: "Cafés",
    colour: "#b98164",
    light: "#edd0a5",
    personality: "Emotionally unavailable until the second coffee.",
    master: ["barista-cap", "cafe-apron", "brewer-pack", "city-cup"],
  },
  {
    id: "tapo",
    name: "Tapo",
    category: "Bars & tapas",
    colour: "#a7bc58",
    light: "#e6eea7",
    personality: "Already ordered another plate for the table.",
    master: ["bucket-hat", "host-vest", "market-tote", "tapas-tray"],
  },
  {
    id: "lux",
    name: "Lux",
    category: "Nightlife",
    colour: "#ab91f8",
    light: "#e9d9ff",
    personality: "One more song. Somehow it is always one more.",
    master: ["headphones", "neon-bomber", "neon-wings", "microphone"],
  },
  {
    id: "musa",
    name: "Musa",
    category: "Culture",
    colour: "#dfad96",
    light: "#fff0d4",
    personality: "Calls the coffee stain a mixed-media experiment.",
    master: ["beret", "artist-coat", "market-tote", "sketchbook"],
  },
  {
    id: "lupa",
    name: "Lupa",
    category: "Shopping",
    colour: "#729ba9",
    light: "#daeef3",
    personality: "Does not need it. Absolutely needs it.",
    master: ["goggles", "patch-jacket", "market-tote", "camera"],
  },
  {
    id: "rayo",
    name: "Rayo",
    category: "Sport",
    colour: "#f6cc61",
    light: "#fff1b4",
    personality: "Says warm-up. Means a small mountain.",
    master: ["sport-band", "track-jacket", "trail-pack", "pennant"],
  },
  {
    id: "nube",
    name: "Nube",
    category: "Wellness",
    colour: "#a7d8e9",
    light: "#f2fcff",
    personality: "Peace, quiet, and a very firm do-not-disturb policy.",
    master: ["flower-crown", "cloud-robe", "neon-wings", "tea-cup"],
  },
  {
    id: "chispa",
    name: "Chispa",
    category: "Family adventures",
    colour: "#f4a19c",
    light: "#ffddcc",
    personality: "Has a plan. And stickers. Mostly stickers.",
    master: ["explorer-hat", "patch-jacket", "trail-pack", "camera"],
  },
  {
    id: "brote",
    name: "Brote",
    category: "Outdoors",
    colour: "#85b988",
    light: "#d4e9b6",
    personality: "Took the scenic route. Is still taking it.",
    master: ["explorer-hat", "trail-jacket", "trail-pack", "walking-staff"],
  },
];
export type Design = {
  id: string;
  name: string;
  slot: Slot;
  shape: string;
  colour: string;
  trim: string;
  rarity: Rarity;
  stat: Stat;
  price: number;
  source: "starter" | "shop" | "earned";
  city?: string;
};
const design = (
  id: string,
  name: string,
  slot: Slot,
  shape: string,
  colour: string,
  trim: string,
  stat: Stat,
  price: number,
  rarity: Rarity = "common",
  source: Design["source"] = "shop",
): Design => ({
  id,
  name,
  slot,
  shape,
  colour,
  trim,
  stat,
  price,
  rarity,
  source,
});
export const designs: Design[] = [
  design(
    "bucket-hat",
    "Wanderer bucket hat",
    "head",
    "bucket",
    "#f1d5a5",
    "#725c52",
    "wits",
    35,
    "common",
    "starter",
  ),
  design(
    "harbour-jacket",
    "Harbour jacket",
    "body",
    "jacket",
    "#477d9e",
    "#f4c977",
    "energy",
    45,
    "common",
    "starter",
  ),
  design(
    "trail-pack",
    "Little trail pack",
    "back",
    "pack",
    "#65876e",
    "#d4b987",
    "energy",
    40,
    "common",
    "starter",
  ),
  design(
    "coffee-cup",
    "First coffee",
    "held",
    "cup",
    "#f3ede0",
    "#d87650",
    "charm",
    30,
    "common",
    "starter",
  ),
  design(
    "barista-cap",
    "Early-bird cap",
    "head",
    "cap",
    "#655448",
    "#eac889",
    "wits",
    65,
  ),
  design(
    "chef-hat",
    "Head chef toque",
    "head",
    "chef",
    "#fff4da",
    "#dcb354",
    "wits",
    110,
    "rare",
  ),
  design(
    "headphones",
    "After-hours headphones",
    "head",
    "phones",
    "#57469d",
    "#baffed",
    "charm",
    100,
    "rare",
  ),
  design(
    "beret",
    "Sunday sketch beret",
    "head",
    "beret",
    "#c75d61",
    "#f2c585",
    "wits",
    75,
    "rare",
  ),
  design(
    "goggles",
    "Curiosity goggles",
    "head",
    "goggles",
    "#856944",
    "#a8f4f6",
    "wits",
    95,
    "rare",
  ),
  design(
    "sport-band",
    "Personal-best band",
    "head",
    "band",
    "#ef8757",
    "#fff1c4",
    "energy",
    55,
  ),
  design(
    "flower-crown",
    "Slow-morning crown",
    "head",
    "flowers",
    "#74a986",
    "#ffd5ac",
    "charm",
    90,
    "rare",
  ),
  design(
    "explorer-hat",
    "Scenic-route hat",
    "head",
    "explorer",
    "#cdae7c",
    "#617d68",
    "energy",
    75,
  ),
  design(
    "cafe-apron",
    "Café society apron",
    "body",
    "apron",
    "#875f4a",
    "#ecd3a6",
    "wits",
    85,
    "rare",
  ),
  design(
    "chef-coat",
    "Master's kitchen coat",
    "body",
    "coat",
    "#f9e8c3",
    "#bd914b",
    "wits",
    200,
    "epic",
  ),
  design(
    "host-vest",
    "Everyone's favourite host",
    "body",
    "vest",
    "#a75851",
    "#ffe0a8",
    "charm",
    95,
    "rare",
  ),
  design(
    "neon-bomber",
    "Midnight current bomber",
    "body",
    "jacket",
    "#6750a0",
    "#9cebd7",
    "charm",
    150,
    "epic",
  ),
  design(
    "artist-coat",
    "Paint-the-town coat",
    "body",
    "coat",
    "#dfab61",
    "#8c627c",
    "wits",
    110,
    "rare",
  ),
  design(
    "patch-jacket",
    "Beautiful chaos jacket",
    "body",
    "patch",
    "#a68ac0",
    "#ffcf95",
    "charm",
    100,
    "rare",
  ),
  design(
    "track-jacket",
    "Golden-hour track top",
    "body",
    "jacket",
    "#e67b53",
    "#fff1ac",
    "energy",
    90,
    "rare",
  ),
  design(
    "cloud-robe",
    "Do-not-disturb robe",
    "body",
    "robe",
    "#a9c8d2",
    "#fff0c9",
    "charm",
    110,
    "rare",
  ),
  design(
    "trail-jacket",
    "Off-the-beaten-track coat",
    "body",
    "coat",
    "#58896e",
    "#f6d697",
    "energy",
    110,
    "rare",
  ),
  design(
    "brewer-pack",
    "Brass brewer backpack",
    "back",
    "brewer",
    "#b99759",
    "#ffe9a5",
    "wits",
    140,
    "epic",
  ),
  design(
    "neon-wings",
    "Moonlight wings",
    "back",
    "wings",
    "#b0a1ff",
    "#9affea",
    "charm",
    160,
    "epic",
  ),
  design(
    "market-tote",
    "Just-one-more tote",
    "back",
    "tote",
    "#f1cda1",
    "#c57268",
    "charm",
    60,
  ),
  design(
    "gold-pan",
    "The golden pan",
    "held",
    "pan",
    "#b89347",
    "#ffe594",
    "energy",
    145,
    "epic",
  ),
  design(
    "tapas-tray",
    "One for the table",
    "held",
    "tray",
    "#c89d5c",
    "#ffdd9d",
    "charm",
    75,
    "rare",
  ),
  design(
    "microphone",
    "Neighbourhood headline",
    "held",
    "mic",
    "#51466d",
    "#b7f0e6",
    "charm",
    90,
    "rare",
  ),
  design(
    "sketchbook",
    "Never-finished sketchbook",
    "held",
    "book",
    "#be8064",
    "#fff2c9",
    "wits",
    75,
  ),
  design(
    "camera",
    "Little memories camera",
    "held",
    "camera",
    "#598797",
    "#ffe0a1",
    "wits",
    115,
    "rare",
  ),
  design(
    "pennant",
    "Team Aki pennant",
    "held",
    "flag",
    "#ec9664",
    "#fff0b1",
    "energy",
    60,
  ),
  design(
    "tea-cup",
    "Nothing urgent tea",
    "held",
    "cup",
    "#a2c3ad",
    "#ffebc4",
    "charm",
    60,
  ),
  design(
    "walking-staff",
    "Long-way-home staff",
    "held",
    "staff",
    "#976d4d",
    "#b6d79a",
    "energy",
    75,
  ),
  design(
    "city-cup",
    "First discovery cup",
    "held",
    "cup",
    "#f0c664",
    "#fff1c3",
    "charm",
    0,
    "rare",
    "earned",
  ),
  design(
    "explorer-medal",
    "Five stories explorer jacket",
    "body",
    "patch",
    "#537d8e",
    "#ffe0a0",
    "energy",
    0,
    "epic",
    "earned",
  ),
  design(
    "master-crown",
    "Ten stories master crown",
    "head",
    "crown",
    "#e5b951",
    "#fff5b7",
    "wits",
    0,
    "legendary",
    "earned",
  ),
];
export const cityCollections = [
  { key: "fuengirola", name: "Fuengirola", colour: "#47a0b0", trim: "#ffd19a" },
  { key: "malaga", name: "Málaga", colour: "#76569a", trim: "#91d6ac" },
  { key: "marbella", name: "Marbella", colour: "#90b6c4", trim: "#fff0bd" },
  { key: "granada", name: "Granada", colour: "#b75662", trim: "#f9d6a9" },
  { key: "sevilla", name: "Sevilla", colour: "#d38c52", trim: "#fff0bb" },
  { key: "madrid", name: "Madrid", colour: "#647eb0", trim: "#f7daa4" },
];
for (const city of cityCollections)
  designs.push({
    ...design(
      `city-${city.key}`,
      `${city.name} keepsake jacket`,
      "body",
      "jacket",
      city.colour,
      city.trim,
      "charm",
      0,
      "epic",
      "earned",
    ),
    city: city.name,
  });
export type Adventure = {
  id: string;
  name: string;
  place: string;
  description: string;
  colour: string;
  steps: {
    title: string;
    text: string;
    options: {
      label: string;
      stat: Stat;
      need: number;
      success: string;
      fallback: string;
    }[];
  }[];
};
export const adventures: Adventure[] = [
  {
    id: "gig",
    name: "One more song",
    place: "The neighbourhood rooftop",
    description:
      "A borrowed sound system. An empty rooftop. Make a night worth remembering.",
    colour: "#ba9edc",
    steps: [
      {
        title: "The lights go out",
        text: "Doors open in ten minutes. The fairy lights have other plans.",
        options: [
          {
            label: "Trace the loose connection",
            stat: "wits",
            need: 6,
            success:
              "The whole rooftop lights up. Even the neighbour applauds.",
            fallback:
              "One string works. A small corner becomes the cosy corner.",
          },
          {
            label: "Carry over the spare lamps",
            stat: "energy",
            need: 3,
            success: "A few warm lamps do the job. Not flashy, but lovely.",
            fallback: "You get one lamp upstairs. The stage stays intimate.",
          },
          {
            label: "Turn it into a candlelit set",
            stat: "charm",
            need: 8,
            success:
              "An accidental acoustic secret show. Everyone thinks it was intentional.",
            fallback:
              "The candles help. Someone still asks where the lights are.",
          },
        ],
      },
      {
        title: "A very quiet amplifier",
        text: "The band's first note sounds like a polite cough.",
        options: [
          {
            label: "Build a clever cable bypass",
            stat: "wits",
            need: 8,
            success: "Clear sound, no buzz. The guitarist wants your number.",
            fallback: "You remove the buzz, but the volume stays modest.",
          },
          {
            label: "Bring the audience closer",
            stat: "charm",
            need: 3,
            success: "A circle around the band. Suddenly it feels special.",
            fallback: "The front row hears everything. The back row chats.",
          },
          {
            label: "Fetch the backup speaker",
            stat: "energy",
            need: 6,
            success: "The spare speaker arrives just in time for the chorus.",
            fallback: "It arrives after the chorus. Still a useful entrance.",
          },
        ],
      },
      {
        title: "One empty dance floor",
        text: "The music is ready. Everybody is pretending not to want to dance.",
        options: [
          {
            label: "Start the first terrible dance",
            stat: "energy",
            need: 3,
            success:
              "Your questionable moves give everybody permission to join.",
            fallback:
              "You dance anyway. A small child becomes your biggest fan.",
          },
          {
            label: "Bring the whole street along",
            stat: "charm",
            need: 9,
            success: "The rooftop becomes the night's favourite story.",
            fallback: "A few neighbours join. They bring snacks. Worth it.",
          },
          {
            label: "Build the perfect set order",
            stat: "wits",
            need: 6,
            success: "One familiar song later, nobody is sitting down.",
            fallback: "A good set, with one very experimental transition.",
          },
        ],
      },
    ],
  },
  {
    id: "cafe",
    name: "The morning rush",
    place: "A tiny corner café",
    description:
      "An unexpectedly busy morning. Help a small café find its rhythm.",
    colour: "#e5ba83",
    steps: [
      {
        title: "The queue reaches the door",
        text: "Coffee orders, pastry orders, and one extremely specific tea.",
        options: [
          {
            label: "Sort a clever order board",
            stat: "wits",
            need: 6,
            success:
              "Every order finds its owner. A small miracle before breakfast.",
            fallback: "Most orders are sorted. The tea remains mysterious.",
          },
          {
            label: "Help carry the first trays",
            stat: "energy",
            need: 3,
            success: "Tables clear and the queue starts moving.",
            fallback: "One tray at a time. Progress is still progress.",
          },
          {
            label: "Keep the waiting crowd smiling",
            stat: "charm",
            need: 8,
            success:
              "The queue starts swapping recommendations instead of complaints.",
            fallback: "A few smiles buy the barista another minute.",
          },
        ],
      },
      {
        title: "No more oat milk",
        text: "The next three customers all wanted the same thing.",
        options: [
          {
            label: "Run to the neighbourhood shop",
            stat: "energy",
            need: 6,
            success: "You return with supplies and a recommendation for lunch.",
            fallback:
              "The shop has one carton. It gets you through the next orders.",
          },
          {
            label: "Offer a simple alternative",
            stat: "charm",
            need: 3,
            success:
              "Honest choices, happy customers. Nobody needed a sales pitch.",
            fallback: "Two people switch orders. One prefers to wait.",
          },
          {
            label: "Rework the drinks menu",
            stat: "wits",
            need: 8,
            success: "An improvised special becomes the café's new favourite.",
            fallback:
              "The special is interesting. The barista suggests a smaller cup.",
          },
        ],
      },
      {
        title: "The last table",
        text: "A tired traveller asks where to go next.",
        options: [
          {
            label: "Share a favourite local spot",
            stat: "charm",
            need: 3,
            success:
              "A real recommendation beats another generic top-ten list.",
            fallback:
              "You point them towards the square. A good place to begin.",
          },
          {
            label: "Plan their perfect little route",
            stat: "wits",
            need: 9,
            success:
              "Coffee, culture, sunset. They leave with a whole day to remember.",
            fallback: "The route is ambitious. They pick the first two stops.",
          },
          {
            label: "Walk them to the next corner",
            stat: "energy",
            need: 6,
            success: "You discover a little mural together on the way.",
            fallback: "You make it to the corner. They can find the rest.",
          },
        ],
      },
    ],
  },
  {
    id: "trail",
    name: "The long way home",
    place: "The coastal path",
    description:
      "A faded sign, a forgotten viewpoint, and a picnic worth earning.",
    colour: "#99c3a5",
    steps: [
      {
        title: "A fork in the path",
        text: "The sign has faded. Both directions look suspiciously scenic.",
        options: [
          {
            label: "Decode the old trail marks",
            stat: "wits",
            need: 6,
            success: "A tiny painted arrow points to the quieter route.",
            fallback: "You find the main path. It is a perfectly good path.",
          },
          {
            label: "Take the gentle marked route",
            stat: "energy",
            need: 3,
            success:
              "A comfortable walk with room to notice the little things.",
            fallback: "A slower walk gives you an excuse for another snack.",
          },
          {
            label: "Ask the regular walkers",
            stat: "charm",
            need: 8,
            success: "They reveal a viewpoint that never made the guidebooks.",
            fallback: "They confirm the main path. At least you are not lost.",
          },
        ],
      },
      {
        title: "The picnic problem",
        text: "Wind has scattered a family's paper napkins across the trail.",
        options: [
          {
            label: "Help gather everything",
            stat: "energy",
            need: 6,
            success:
              "Every scrap is collected. The family insists you take a biscuit.",
            fallback:
              "You catch most of them. Another walker gets the last one.",
          },
          {
            label: "Ask everybody to help",
            stat: "charm",
            need: 3,
            success: "Five people make very short work of one gust of wind.",
            fallback: "Two people join. The trail still looks better.",
          },
          {
            label: "Make a windproof picnic setup",
            stat: "wits",
            need: 8,
            success:
              "A few stones, a clever fold, and nothing blows away again.",
            fallback:
              "The napkins stay put. A sandwich briefly attempts escape.",
          },
        ],
      },
      {
        title: "Golden hour",
        text: "The sun starts to lower. There is time for one last stop.",
        options: [
          {
            label: "Enjoy the view right here",
            stat: "charm",
            need: 3,
            success:
              "No extra miles needed. You were already somewhere lovely.",
            fallback: "You find a comfortable rock and call it your viewpoint.",
          },
          {
            label: "Reach the little lookout",
            stat: "energy",
            need: 9,
            success: "The last climb earns a coastline full of golden light.",
            fallback:
              "Halfway up is beautiful too. That is where the picnic happens.",
          },
          {
            label: "Find the best photograph",
            stat: "wits",
            need: 6,
            success: "One frame catches the whole feeling of the afternoon.",
            fallback:
              "The picture is slightly crooked. The memory is excellent.",
          },
        ],
      },
    ],
  },
];
export type Equipment = {
  id: string;
  design: string;
  appearance: string;
  level: number;
  sockets: (Stat | null)[];
};
export type Run = {
  adventure: string;
  step: number;
  stats: Record<Stat, number>;
  successes: number;
  bonuses: number;
  history: {
    title: string;
    result: string;
    success: boolean;
    bonus: boolean;
  }[];
};
export type Report = { title: string; text: string; design?: string };
export type State = {
  schema: 1;
  family: Family | null;
  name: string;
  createdDay: number;
  lastParcelDay: number;
  threads: number;
  scrap: number;
  xp: number;
  equipment: Equipment[];
  wardrobe: string[];
  equipped: Record<Slot, string | null>;
  modules: Record<Stat, number>;
  rewards: string[];
  claimed: string[];
  run: Run | null;
  mapEnabled: boolean;
  goal: string | null;
  report: Report;
  updatedAt: number;
};
export type Action =
  | { type: "adopt"; family: Family; name: string }
  | { type: "rename"; name: string }
  | { type: "family"; family: Family }
  | { type: "equip" | "upgrade" | "socket" | "scrap"; itemId: string }
  | { type: "unequip"; slot: Slot }
  | { type: "module"; itemId: string; index: number; stat: Stat | null }
  | { type: "merge"; itemId: string; duplicateId: string }
  | { type: "appearance"; itemId: string; appearance: string }
  | { type: "parcel" | "claim" | "leave" }
  | { type: "buy"; sku: string }
  | { type: "start"; adventure: string }
  | { type: "choice"; index: number }
  | { type: "map"; enabled: boolean }
  | { type: "goal"; sku: string | null };
export type EarnedAchievement = {
  key: string;
  city_key: string | null;
  unlocked_at: string | null;
  archived?: boolean;
};
export type Context = {
  now: number;
  id: () => string;
  random: () => number;
  achievements?: EarnedAchievement[];
};
export class RuleError extends Error {}
function fail(message: string): never {
  throw new RuleError(message);
}
export function getDesign(id: string) {
  return (
    designs.find((d) => d.id === id) ?? fail("That design does not exist.")
  );
}
function getItem(s: State, id: string) {
  return (
    s.equipment.find((i) => i.id === id) ??
    fail("That piece is no longer in your inventory. Refresh and try again.")
  );
}
export function stats(s: State): Record<Stat, number> {
  const result = { wits: 3, energy: 3, charm: 3 };
  for (const id of Object.values(s.equipped)) {
    const item = s.equipment.find((i) => i.id === id);
    if (!item) continue;
    result[getDesign(item.design).stat] += Math.floor(item.level / 2);
    for (const fittedModule of item.sockets)
      if (fittedModule) result[fittedModule] += 2;
  }
  return result;
}
export function activeModules(s: State) {
  return Object.values(s.equipped).reduce(
    (sum, id) =>
      sum +
      (s.equipment.find((i) => i.id === id)?.sockets.filter(Boolean).length ??
        0),
    0,
  );
}
export function parcels(s: State, now: number) {
  return Math.min(3, Math.max(0, Math.floor(now / DAY) - s.lastParcelDay));
}
export function levelCost(i: Equipment) {
  return 15 * i.level;
}
export function socketCost(i: Equipment) {
  return 30 * i.sockets.length;
}
export function scrapValue(i: Equipment) {
  return 8 + 4 * i.level + 3 * (i.sockets.length - 1);
}
export function initialState(now: number): State {
  const day = Math.floor(now / DAY);
  return {
    schema: 1,
    family: null,
    name: "",
    createdDay: day,
    lastParcelDay: day - 1,
    threads: 90,
    scrap: 60,
    xp: 0,
    equipment: [],
    wardrobe: [],
    equipped: { head: null, body: null, back: null, held: null },
    modules: { wits: 2, energy: 2, charm: 2 },
    rewards: [],
    claimed: [],
    run: null,
    mapEnabled: false,
    goal: null,
    report: {
      title: "Your next little adventure",
      text: "Pick a Pal. Make it yours.",
    },
    updatedAt: now,
  };
}
function addItem(
  s: State,
  id: string,
  ctx: Context,
  socketCount = 1,
): Equipment | null {
  getDesign(id);
  if (!s.wardrobe.includes(id)) s.wardrobe.push(id);
  if (s.equipment.length >= MAX_INVENTORY) {
    s.scrap += 16;
    return null;
  }
  const item: Equipment = {
    id: ctx.id(),
    design: id,
    appearance: id,
    level: 1,
    sockets: Array.from({ length: socketCount }, () => null),
  };
  s.equipment.push(item);
  return item;
}
function spend(s: State, currency: "threads" | "scrap", amount: number) {
  if (s[currency] < amount) fail(`You need ${amount} ${currency}.`);
  s[currency] -= amount;
}
function cleanName(input: string) {
  const name = input.normalize("NFC").trim();
  if (
    name.length < 1 ||
    name.length > 24 ||
    Array.from(name).some(
      (character) =>
        character.charCodeAt(0) < 32 ||
        character.charCodeAt(0) === 127 ||
        character === "<" ||
        character === ">",
    )
  )
    fail(
      "Choose a name of 1–24 characters without markup or control characters.",
    );
  return name;
}
function refundModules(s: State, item: Equipment) {
  for (const stat of item.sockets) if (stat) s.modules[stat] += 1;
}
function removeItem(s: State, item: Equipment) {
  s.equipment = s.equipment.filter((i) => i.id !== item.id);
}
function say(s: State, title: string, text: string, designId?: string) {
  s.report = { title, text, ...(designId ? { design: designId } : {}) };
}
export function applyAction(
  current: State,
  action: Action,
  ctx: Context,
): State {
  if (current.schema !== 1) fail("This save needs a newer version of AkiPals.");
  const s: State = structuredClone(current);
  const day = Math.floor(ctx.now / DAY);
  if (!s.family && action.type !== "adopt") fail("Adopt your Pal first.");
  switch (action.type) {
    case "adopt": {
      if (s.family)
        fail(
          "You already have a Pal. Change its family in the studio instead.",
        );
      if (!families.some((f) => f.id === action.family))
        fail("Choose one of the ten Pal families.");
      s.family = action.family;
      s.name = cleanName(action.name);
      for (const id of [
        "bucket-hat",
        "harbour-jacket",
        "trail-pack",
        "coffee-cup",
      ]) {
        const item = addItem(s, id, ctx)!;
        s.equipped[getDesign(id).slot] = item.id;
      }
      say(
        s,
        `Meet ${s.name}`,
        "A starter outfit, six modules, and a whole world of little stories.",
      );
      break;
    }
    case "rename":
      s.name = cleanName(action.name);
      say(s, "New name, same little legend", `Your Pal is now ${s.name}.`);
      break;
    case "family": {
      if (!families.some((f) => f.id === action.family))
        fail("Choose one of the ten Pal families.");
      s.family = action.family;
      say(
        s,
        "A different kind of little guy",
        "Your name, collection and progress stay with you. Family changes are free in this preview.",
      );
      break;
    }
    case "equip": {
      const item = getItem(s, action.itemId);
      s.equipped[getDesign(item.design).slot] = item.id;
      if (activeModules(s) > MAX_ACTIVE_MODULES)
        fail("A loadout can use six active modules. Remove a module first.");
      say(s, "Looking good", `${getDesign(item.appearance).name} equipped.`);
      break;
    }
    case "unequip":
      s.equipped[action.slot] = null;
      say(s, "Back to basics", "The item is safely in your inventory.");
      break;
    case "upgrade": {
      const item = getItem(s, action.itemId);
      if (item.level >= MAX_LEVEL) fail("This piece is already level 10.");
      spend(s, "scrap", levelCost(item));
      item.level += 1;
      say(
        s,
        "A little stronger",
        `${getDesign(item.design).name} is now level ${item.level}.`,
      );
      break;
    }
    case "socket": {
      const item = getItem(s, action.itemId);
      if (item.sockets.length >= 3) fail("Three sockets is the maximum.");
      spend(s, "scrap", socketCost(item));
      item.sockets.push(null);
      say(s, "Room for a new idea", "A new socket is ready for a module.");
      break;
    }
    case "module": {
      const item = getItem(s, action.itemId);
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= item.sockets.length
      )
        fail("That socket is not open.");
      const previous = item.sockets[action.index];
      if (action.stat !== null && !STATS.includes(action.stat))
        fail("Unknown module.");
      if (previous === action.stat) fail("That module is already fitted.");
      if (previous) s.modules[previous] += 1;
      if (action.stat) {
        if (s.modules[action.stat] < 1)
          fail("You do not have a spare module of that type.");
        s.modules[action.stat] -= 1;
      }
      item.sockets[action.index] = action.stat;
      if (activeModules(s) > MAX_ACTIVE_MODULES)
        fail("Six active modules maximum. Swap or remove one first.");
      say(
        s,
        "Loadout updated",
        action.stat
          ? `A ${action.stat} module adds +2 ${action.stat} when this item is equipped.`
          : "The module is back in your inventory.",
      );
      break;
    }
    case "scrap": {
      const item = getItem(s, action.itemId);
      if (Object.values(s.equipped).includes(item.id))
        fail("Unequip this item before scrapping it.");
      const value = scrapValue(item);
      s.scrap += value;
      refundModules(s, item);
      removeItem(s, item);
      say(
        s,
        "Nothing wasted",
        `+${value} Scrap. Its appearance stays in your wardrobe; fitted modules are returned.`,
      );
      break;
    }
    case "merge": {
      const target = getItem(s, action.itemId);
      const spare = getItem(s, action.duplicateId);
      if (target.id === spare.id || target.design !== spare.design)
        fail("Choose a separate copy of the same design.");
      if (Object.values(s.equipped).includes(spare.id))
        fail("Unequip the spare copy before merging it.");
      target.level = Math.max(target.level, spare.level);
      while (target.sockets.length < spare.sockets.length)
        target.sockets.push(null);
      refundModules(s, spare);
      removeItem(s, spare);
      say(
        s,
        "Best of both",
        "Kept the highest level and socket count. Spare modules returned; appearance preserved.",
      );
      break;
    }
    case "appearance": {
      const item = getItem(s, action.itemId);
      const look = getDesign(action.appearance);
      if (
        !s.wardrobe.includes(look.id) ||
        look.slot !== getDesign(item.design).slot
      )
        fail("Collect a compatible appearance first.");
      item.appearance = look.id;
      say(
        s,
        "Style without compromise",
        "Appearance changed. Equipment level, sockets and stats stay exactly the same.",
      );
      break;
    }
    case "parcel": {
      const count = parcels(s, ctx.now);
      if (!count)
        fail(
          "Your next free parcel arrives at 00:00 UTC. Up to three can wait for you.",
        );
      s.lastParcelDay = day - count + 1;
      const pool = designs.filter((d) => d.source !== "earned");
      const roll = ctx.random();
      const picked =
        pool[
          Math.min(pool.length - 1, Math.floor(Math.max(0, roll) * pool.length))
        ];
      const socketCount = ctx.random() < 0.15 ? 3 : ctx.random() < 0.4 ? 2 : 1;
      const item = addItem(s, picked.id, ctx, socketCount);
      const fittedModule =
        STATS[Math.min(2, Math.floor(Math.max(0, ctx.random()) * 3))];
      s.modules[fittedModule] += 1;
      s.threads += 40;
      s.scrap += 15;
      s.xp += 10;
      say(
        s,
        "Lost & found, now yours",
        `${item ? picked.name + ` · ${socketCount} socket${socketCount > 1 ? "s" : ""}` : "Inventory full: appearance collected and +16 bonus Scrap"}. +40 Threads, +15 Scrap, +1 ${fittedModule} module.`,
        picked.id,
      );
      break;
    }
    case "buy": {
      const d = getDesign(action.sku);
      if (d.source === "earned" || d.price <= 0)
        fail("This keepsake is earned by exploring, not bought.");
      if (s.equipment.length >= MAX_INVENTORY)
        fail("Your inventory is full. Scrap or merge a spare piece first.");
      spend(s, "threads", d.price);
      addItem(s, d.id, ctx);
      say(
        s,
        "A new favourite",
        `${d.name} added to your collection. Threads are earned in-game; no money was charged.`,
        d.id,
      );
      break;
    }
    case "start": {
      if (s.run) fail("Finish or leave your current adventure first.");
      const adventure =
        adventures.find((a) => a.id === action.adventure) ??
        fail("That adventure does not exist.");
      s.run = {
        adventure: adventure.id,
        step: 0,
        stats: stats(s),
        successes: 0,
        bonuses: 0,
        history: [],
      };
      say(
        s,
        adventure.name,
        "Your current stats are saved for this run. Choose an approach for each little problem.",
      );
      break;
    }
    case "choice": {
      const run = s.run ?? fail("Start an adventure first.");
      const adventure = adventures.find((a) => a.id === run.adventure)!;
      const step = adventure.steps[run.step];
      const option = step?.options[action.index];
      if (!option || !Number.isInteger(action.index))
        fail("Choose one of the available approaches.");
      const success = run.stats[option.stat] >= option.need;
      const bonus = success && option.need > 3;
      run.successes += Number(success);
      run.bonuses += Number(bonus);
      const result = success ? option.success : option.fallback;
      run.history.push({ title: step.title, result, success, bonus });
      run.step += 1;
      say(
        s,
        success
          ? bonus
            ? "A little extra magic"
            : "Nicely done"
          : "A different sort of success",
        result,
      );
      if (run.step === adventure.steps.length) {
        const key = `${day}:${adventure.id}`;
        const reward = !s.rewards.includes(key);
        if (reward) {
          s.threads += 35 + 5 * run.bonuses;
          s.scrap += 12 + 5 * run.bonuses;
          s.xp += 20 + 5 * run.bonuses;
          s.rewards = s.rewards.filter(
            (k) => Number(k.split(":")[0]) >= day - 7,
          );
          s.rewards.push(key);
        }
        say(
          s,
          "Another story for the collection",
          `${result} ${reward ? `+${35 + 5 * run.bonuses} Threads, +${12 + 5 * run.bonuses} Scrap. ${run.bonuses}/3 bonus moments.` : "Practice run complete. Today's reward for this adventure is already collected."}`,
        );
      }
      break;
    }
    case "leave":
      s.run = null;
      say(
        s,
        "Back at your hideout",
        "Your collection is safe. A new story can wait.",
      );
      break;
    case "claim": {
      if (!ctx.achievements)
        fail(
          "Your verified achievements could not be loaded. No rewards have been changed.",
        );
      const unlocked = ctx.achievements.filter(
        (a) => Boolean(a.unlocked_at) && !a.archived,
      );
      const available: string[] = [];
      if (unlocked.length >= 1) available.push("city-cup");
      if (unlocked.length >= 5) available.push("explorer-medal");
      if (unlocked.length >= 10) available.push("master-crown");
      for (const city of cityCollections)
        if (
          unlocked.some(
            (a) =>
              a.city_key
                ?.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase() === city.key,
          )
        )
          available.push(`city-${city.key}`);
      let count = 0;
      for (const id of available)
        if (!s.claimed.includes(id)) {
          addItem(s, id, ctx, 3);
          s.claimed.push(id);
          count += 1;
        }
      say(
        s,
        count ? "You earned these stories" : "Your keepsakes are up to date",
        count
          ? `${count} guaranteed keepsake${count === 1 ? "" : "s"} from your verified AkiPasa achievements. Never sold in the shop.`
          : "Unlock AkiPasa achievements through verified visits. This preview recognises six city collections and 1, 5 and 10 unlocked-achievement milestones.",
      );
      break;
    }
    case "map":
      s.mapEnabled = action.enabled;
      say(
        s,
        action.enabled
          ? "Your little travel companion"
          : "Classic location marker",
        action.enabled
          ? "Map companion enabled for this account. Your position is only shown to you."
          : "The standard location marker is restored.",
      );
      break;
    case "goal": {
      if (action.sku !== null && getDesign(action.sku).source === "earned")
        fail("Choose a shop design as your savings goal.");
      s.goal = action.sku;
      say(
        s,
        "Something to work towards",
        action.sku
          ? `Saving for ${getDesign(action.sku).name}.`
          : "Your savings goal is cleared.",
      );
      break;
    }
    default:
      fail("Unknown action.");
  }
  s.updatedAt = ctx.now;
  return s;
}
