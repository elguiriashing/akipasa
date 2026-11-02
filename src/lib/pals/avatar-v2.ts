import { z } from "zod";
import { SUPPORTED_AUTHORED_OPTIONS } from "./catalogue";

/**
 * AkiPals identity v2. Stylised illustration, not biometrics.
 * Choices are bounded presets; nothing estimates someone's real appearance.
 */
export const appearanceSchema = z
  .object({
    // Older saved looks retain their original renderer until the owner chooses
    // a different model. Model IDs are local presets, never supplied asset URLs.
    model: z.enum(["classic-v2", "rain-v3", "snow-v4"]).default("classic-v2"),
    bodyStyle: z.enum(["feminine", "masculine"]).default("feminine"),
    skin: z.enum(["porcelain", "light", "warm", "olive", "brown", "deep"]),
    face: z.enum(["oval", "round", "angular"]),
    hair: z.enum(["buzz", "crop", "quiff", "bob", "curls", "long", "bun"]),
    hairColor: z.enum([
      "black",
      "espresso",
      "chestnut",
      "auburn",
      "blonde",
      "silver",
      "pink",
      "blue",
    ]),
    eyes: z.enum(["soft", "almond", "wide"]),
    eyeColor: z.enum(["brown", "hazel", "green", "blue", "grey"]),
    brows: z.enum(["soft", "bold", "arched"]),
    nose: z.enum(["soft", "straight", "button"]),
    mouth: z.enum(["smile", "neutral", "grin"]),
    ears: z.enum(["small", "regular", "prominent"]),
    chin: z.enum(["soft", "pointed", "square"]),
    neck: z.enum(["slim", "regular", "broad"]),
    shoulders: z.enum(["narrow", "regular", "wide"]),
    height: z.enum(["short", "medium", "tall"]),
    build: z.enum(["slim", "regular", "broad"]),
    top: z.enum(["tee", "hoodie", "jacket", "sweater"]),
    topColor: z.enum(["orange", "ink", "cream", "mint", "purple", "red"]),
    bottom: z.enum(["cargo", "jeans", "tailored", "shorts"]).default("cargo"),
    bottomColor: z
      .enum(["orange", "ink", "cream", "mint", "purple", "red"])
      .default("ink"),
    shoeColor: z
      .enum(["orange", "ink", "cream", "mint", "purple", "red"])
      .default("cream"),
    shoes: z.enum(["sneakers", "boots", "trainers"]).default("sneakers"),
    bag: z.enum(["none", "crossbody", "backpack"]).default("crossbody"),
    accessory: z.enum(["none", "glasses", "earrings", "cap"]).default("none"),
  })
  .strict();

export type Appearance = z.infer<typeof appearanceSchema>;

export const DEFAULT_APPEARANCE: Appearance = {
  model: "rain-v3",
  bodyStyle: "feminine",
  skin: "warm",
  face: "oval",
  hair: "quiff",
  hairColor: "espresso",
  eyes: "soft",
  eyeColor: "brown",
  brows: "soft",
  nose: "soft",
  mouth: "smile",
  ears: "regular",
  chin: "soft",
  neck: "regular",
  shoulders: "regular",
  height: "medium",
  build: "regular",
  top: "tee",
  topColor: "orange",
  bottom: "cargo",
  bottomColor: "ink",
  shoeColor: "cream",
  shoes: "sneakers",
  bag: "crossbody",
  accessory: "none",
};

/** Selectable authored characters. Legacy IDs remain parseable for private saves. */
export const AUTHORED_CHARACTER_PRESETS = [
  { id: "rain-v3", name: "Rain", bodyStyle: "feminine" },
  { id: "snow-v4", name: "Snow", bodyStyle: "masculine" },
] as const;
export type AuthoredModel = (typeof AUTHORED_CHARACTER_PRESETS)[number]["id"];

/** Read-only presentation projection: never writes or migrates a saved row.
 * Unsupported legacy hair projects onto an available fit for the selected model;
 * the original row remains unchanged until its owner explicitly saves.
 */
export function authoredAppearance(value: unknown): Appearance {
  const parsed = appearanceSchema.parse(value);
  const model =
    parsed.model === "classic-v2"
      ? parsed.bodyStyle === "masculine"
        ? "snow-v4"
        : "rain-v3"
      : parsed.model;
  return {
    ...parsed,
    hair: (
      SUPPORTED_AUTHORED_OPTIONS[model].hair as readonly string[]
    ).includes(parsed.hair)
      ? parsed.hair
      : model === "snow-v4"
        ? "crop"
        : "long",
    model,
    bodyStyle: model === "snow-v4" ? "masculine" : "feminine",
  };
}

export function characterAppearance(model: AuthoredModel): Appearance {
  return {
    ...DEFAULT_APPEARANCE,
    model,
    bodyStyle: model === "snow-v4" ? "masculine" : "feminine",
    hair: model === "snow-v4" ? "crop" : "long",
    hairColor: model === "snow-v4" ? "black" : "auburn",
    top: model === "snow-v4" ? "hoodie" : "tee",
    topColor: model === "snow-v4" ? "ink" : "orange",
  };
}

/** Every starter item and colour is free. No paid, random or unlockable gear here. */
export const APPEARANCE_OPTIONS: Record<keyof Appearance, readonly string[]> = {
  model: ["rain-v3", "snow-v4"],
  bodyStyle: ["feminine", "masculine"],
  skin: ["porcelain", "light", "warm", "olive", "brown", "deep"],
  face: ["oval", "round", "angular"],
  hair: ["buzz", "crop", "quiff", "bob", "curls", "long", "bun"],
  hairColor: [
    "black",
    "espresso",
    "chestnut",
    "auburn",
    "blonde",
    "silver",
    "pink",
    "blue",
  ],
  eyes: ["soft", "almond", "wide"],
  eyeColor: ["brown", "hazel", "green", "blue", "grey"],
  brows: ["soft", "bold", "arched"],
  nose: ["soft", "straight", "button"],
  mouth: ["smile", "neutral", "grin"],
  ears: ["small", "regular", "prominent"],
  chin: ["soft", "pointed", "square"],
  neck: ["slim", "regular", "broad"],
  shoulders: ["narrow", "regular", "wide"],
  height: ["short", "medium", "tall"],
  build: ["slim", "regular", "broad"],
  top: ["tee", "hoodie", "jacket", "sweater"],
  topColor: ["orange", "ink", "cream", "mint", "purple", "red"],
  bottom: ["cargo", "jeans", "tailored", "shorts"],
  bottomColor: ["orange", "ink", "cream", "mint", "purple", "red"],
  shoeColor: ["orange", "ink", "cream", "mint", "purple", "red"],
  shoes: ["sneakers", "boots", "trainers"],
  bag: ["none", "crossbody", "backpack"],
  accessory: ["none", "glasses", "earrings", "cap"],
};

const skin: Record<Appearance["skin"], string> = {
  porcelain: "#F6D8C4",
  light: "#EEC5AA",
  warm: "#DCA681",
  olive: "#BA8B69",
  brown: "#996747",
  deep: "#604034",
};
const hair: Record<Appearance["hairColor"], string> = {
  black: "#232733",
  espresso: "#43312C",
  chestnut: "#815139",
  auburn: "#AB583C",
  blonde: "#D7B06D",
  silver: "#A5AEB9",
  pink: "#D98BA9",
  blue: "#4E73B6",
};
const iris: Record<Appearance["eyeColor"], string> = {
  brown: "#624237",
  hazel: "#8D734A",
  green: "#47775B",
  blue: "#4987AE",
  grey: "#7A8191",
};
const tops: Record<Appearance["topColor"], string> = {
  orange: "#F97840",
  ink: "#293348",
  cream: "#EADDC6",
  mint: "#64B7A4",
  purple: "#8467C1",
  red: "#BC5666",
};

/** Closed swatches shared by customisation controls and authored renderers. */
export const APPEARANCE_PALETTES = {
  skin,
  hairColor: hair,
  eyeColor: iris,
  topColor: tops,
  bottomColor: tops,
  shoeColor: tops,
} as const;

/** Only receives parsed enum values, so the SVG cannot contain supplied markup. */
export function renderHumanAvatar(
  appearance: Appearance,
  prefix = "pals-human",
): string {
  const a = appearanceSchema.parse(appearance);
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "pals-human";
  const tone = skin[a.skin],
    locks = hair[a.hairColor],
    eye = iris[a.eyeColor];
  const fabric = tops[a.topColor],
    contour = "#423843";
  const torsoHalf =
    { narrow: 53, regular: 64, wide: 76 }[a.shoulders] *
    { slim: 0.9, regular: 1, broad: 1.12 }[a.build];
  const length = { short: 354, medium: 370, tall: 388 }[a.height];
  const faceRx = { oval: 45, round: 49, angular: 44 }[a.face];
  const faceRy = { oval: 63, round: 55, angular: 64 }[a.face];
  const earRx = { small: 6, regular: 9, prominent: 13 }[a.ears];
  const neckWidth = { slim: 13, regular: 19, broad: 26 }[a.neck];
  const eyesRy = { soft: 6.5, almond: 4.3, wide: 8.8 }[a.eyes];
  const browStroke = a.brows === "bold" ? 4.8 : 2.5;
  const browPath =
    a.brows === "arched"
      ? "M114 131Q123 122 133 129M167 129Q177 122 186 131"
      : "M114 129Q124 126 134 129M166 129Q177 126 186 129";
  const chinAccent =
    a.chin === "pointed"
      ? '<path d="M132 188Q150 203 168 188" fill="none" stroke="#6C453C" stroke-opacity=".18" stroke-width="2"/>'
      : a.chin === "square"
        ? '<path d="M130 192H170" stroke="#6C453C" stroke-opacity=".2" stroke-width="2"/>'
        : "";
  const mouth =
    a.mouth === "grin"
      ? '<path d="M135 167Q151 188 165 167Z" fill="#A7515A" stroke="#714B53" stroke-width="2"/><path d="M137 169H163" stroke="#FFF1E3" stroke-width="4"/>'
      : a.mouth === "neutral"
        ? '<path d="M137 171Q150 172 163 171" fill="none" stroke="#8C5051" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M136 167Q150 183 164 167" fill="none" stroke="#8C5051" stroke-width="3.3" stroke-linecap="round"/>';
  const nose =
    a.nose === "straight"
      ? "M150 146L146 157L154 160"
      : a.nose === "button"
        ? "M145 157Q150 162 155 157"
        : "M150 149Q145 158 154 159";
  const hairBack = ["bob", "curls", "long", "bun"].includes(a.hair)
    ? '<path d="M100 119Q91 60 150 62Q211 62 199 126L214 232Q192 245 175 201L125 201Q108 247 87 226Z" fill="' +
      locks +
      '"/>'
    : "";
  const fringe =
    a.hair === "buzz"
      ? '<path d="M107 110Q112 74 149 77Q187 74 193 110Q153 93 107 110Z" fill="' +
        locks +
        '"/>'
      : a.hair === "crop"
        ? '<path d="M104 122Q94 84 120 71Q166 54 192 98L194 126L180 109L171 93L142 105L121 98Z" fill="' +
          locks +
          '"/>'
        : a.hair === "quiff"
          ? '<path d="M104 123Q91 88 113 73Q126 53 147 69Q168 43 189 84L198 125L183 118L178 91Q140 117 113 101Z" fill="' +
            locks +
            '"/>'
          : a.hair === "curls"
            ? '<g fill="' +
              locks +
              '">' +
              [
                [109, 107],
                [105, 89],
                [117, 74],
                [137, 70],
                [157, 69],
                [177, 79],
                [191, 97],
                [194, 116],
              ]
                .map(
                  ([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="18"/>',
                )
                .join("") +
              "</g>"
            : '<path d="M103 123Q89 66 146 65Q202 60 198 124L184 112L171 94Q140 112 113 102Z" fill="' +
              locks +
              '"/>';
  const topDetails =
    a.top === "hoodie"
      ? '<path d="M115 223Q150 272 185 223L174 215Q150 249 126 215Z" fill="#1C2438" opacity=".35"/><path d="M144 255V296M157 255V296" stroke="#F6EADA" stroke-width="3" stroke-linecap="round"/>'
      : a.top === "jacket"
        ? '<path d="M150 236V370" stroke="#F5EEE1" stroke-width="8"/><path d="M127 233L150 257L173 233" fill="none" stroke="#2E2940" stroke-width="4"/><circle cx="150" cy="302" r="3" fill="#F5EEE1"/>'
        : a.top === "sweater"
          ? '<path d="M102 235H198M102 334H198" stroke="#FCF3E5" stroke-opacity=".35" stroke-width="9"/>'
          : '<path d="M133 226Q150 242 167 226" fill="none" stroke="#FFF2DC" stroke-opacity=".7" stroke-width="5"/>';
  const headAccessory =
    a.hair === "bun"
      ? '<circle cx="150" cy="63" r="25" fill="' +
        locks +
        '" stroke="' +
        contour +
        '" stroke-opacity=".25" stroke-width="2"/>'
      : "";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 440" role="img" aria-label="Customisable illustrated person">' +
    '<defs><linearGradient id="' +
    id +
    '-shirt" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' +
    fabric +
    '"/><stop offset="1" stop-color="' +
    fabric +
    '" stop-opacity=".8"/></linearGradient></defs>' +
    '<ellipse cx="150" cy="418" rx="92" ry="12" fill="#20202C" opacity=".12"/>' +
    hairBack +
    headAccessory +
    '<path d="M115 340L114 ' +
    length +
    "L110 404Q121 418 141 408L147 349ZM185 340L188 " +
    length +
    'L192 404Q179 418 158 408L153 349Z" fill="#32445B" stroke="' +
    contour +
    '" stroke-width="3"/>' +
    '<path d="M108 397Q121 404 144 400L146 413Q124 426 105 414ZM156 400Q179 404 191 397L197 414Q174 426 154 413Z" fill="#F5EAD8" stroke="' +
    contour +
    '" stroke-width="2"/>' +
    '<path d="M' +
    (150 - torsoHalf) +
    " 236Q150 210 " +
    (150 + torsoHalf) +
    " 236L" +
    (166 + torsoHalf) +
    " 348Q150 362 " +
    (134 - torsoHalf) +
    ' 348Z" fill="url(#' +
    id +
    '-shirt)" stroke="' +
    contour +
    '" stroke-width="3"/>' +
    '<path d="M' +
    (150 - torsoHalf) +
    " 240Q" +
    (115 - torsoHalf) +
    " 264 " +
    (113 - torsoHalf) +
    ' 325" fill="none" stroke="' +
    fabric +
    '" stroke-width="26" stroke-linecap="round"/>' +
    '<path d="M' +
    (150 + torsoHalf) +
    " 240Q" +
    (185 + torsoHalf) +
    " 264 " +
    (187 + torsoHalf) +
    ' 325" fill="none" stroke="' +
    fabric +
    '" stroke-width="26" stroke-linecap="round"/>' +
    '<path d="M' +
    (113 - torsoHalf) +
    " 325L" +
    (108 - torsoHalf) +
    " 340M" +
    (187 + torsoHalf) +
    " 325L" +
    (192 + torsoHalf) +
    ' 340" stroke="' +
    tone +
    '" stroke-width="19" stroke-linecap="round"/>' +
    '<rect x="' +
    (150 - neckWidth) +
    '" y="180" width="' +
    neckWidth * 2 +
    '" height="58" rx="12" fill="' +
    tone +
    '"/>' +
    '<ellipse cx="' +
    (150 - faceRx) +
    '" cy="142" rx="' +
    earRx +
    '" ry="17" fill="' +
    tone +
    '" stroke="' +
    contour +
    '" stroke-opacity=".35" stroke-width="2"/>' +
    '<ellipse cx="' +
    (150 + faceRx) +
    '" cy="142" rx="' +
    earRx +
    '" ry="17" fill="' +
    tone +
    '" stroke="' +
    contour +
    '" stroke-opacity=".35" stroke-width="2"/>' +
    '<ellipse cx="150" cy="138" rx="' +
    faceRx +
    '" ry="' +
    faceRy +
    '" fill="' +
    tone +
    '" stroke="' +
    contour +
    '" stroke-opacity=".4" stroke-width="2.5"/>' +
    '<ellipse cx="123" cy="164" rx="12" ry="5" fill="#DE8D87" opacity=".22"/><ellipse cx="177" cy="164" rx="12" ry="5" fill="#DE8D87" opacity=".22"/>' +
    '<path d="' +
    browPath +
    '" fill="none" stroke="' +
    locks +
    '" stroke-width="' +
    browStroke +
    '" stroke-linecap="round"/>' +
    '<ellipse cx="124" cy="143" rx="6.7" ry="' +
    eyesRy +
    '" fill="#FFFCF6"/><ellipse cx="176" cy="143" rx="6.7" ry="' +
    eyesRy +
    '" fill="#FFFCF6"/>' +
    '<circle cx="124" cy="143" r="3.6" fill="' +
    eye +
    '"/><circle cx="176" cy="143" r="3.6" fill="' +
    eye +
    '"/>' +
    '<circle cx="125" cy="141" r="1.2" fill="#FFFFFF"/><circle cx="177" cy="141" r="1.2" fill="#FFFFFF"/>' +
    '<path d="' +
    nose +
    '" fill="none" stroke="#8F5F51" stroke-opacity=".65" stroke-width="2.5" stroke-linecap="round"/>' +
    mouth +
    chinAccent +
    fringe +
    topDetails +
    "</svg>"
  );
}
