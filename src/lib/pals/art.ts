import {
  families,
  getDesign,
  type Design,
  type Family,
  type State,
} from "./engine";
import { familyStyles } from "./style-guide";

/** Original layered vector artwork; no stock assets, brand crests, fonts or remote images. */
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

/** Small first-party embroidery marks; never official crests or brand logos. */
function motif(kind: string, colour: string, x: number, y: number, scale = 1) {
  const shapes: Record<string, string> = {
    flame: "M0-10C2-3 10 0 6 7C3 12-5 10-7 5C-9 1-4-3-3-6L-1 0Z",
    bean: "M-5-8C5-13 12 0 5 7C-3 15-13 2-5-8Z",
    olive:
      "M-7 3C-6-7 8-9 8 0C8 8-6 13-7 3ZM0-6C0-13 10-14 12-11C10-6 4-5 0-6Z",
    moon: "M5-10C-7-11-13 3-5 9C1 14 8 10 11 5C0 8-6-4 5-10Z",
    spark: "M0-11L3-3L11 0L3 3L0 11L-3 3L-11 0L-3-3Z",
    diamond: "M0-10L10 0L0 10L-10 0ZM0-5L-5 0L0 5L5 0Z",
    bolt: "M0-11L-8 2H-1L-4 12L9-3H2L6-11Z",
    cloud: "M-8 7C-17 4-11-5-5-2C-6-12 8-12 9-3C18-3 17 9 8 8Z",
    star: "M0-11L4-4L12-3L6 3L8 11L0 7L-8 11L-6 3L-12-3L-4-4Z",
    leaf: "M-7 9C-14-5 1-13 10-10C13 3 4 12-7 9Z",
  };
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${colour}" stroke="none"><path d="${shapes[kind] ?? shapes.spark}" fill-rule="evenodd"/>${kind === "bean" ? '<path d="M2-7C-7-2 7 1-2 8" stroke="#fff9e5" stroke-width="1.5" fill="none"/>' : ""}${kind === "leaf" ? '<path d="M-7 9L6-6" stroke="#fff9e5" stroke-width="1.5" fill="none"/>' : ""}</g>`;
}

function cityBadge(city: string, trim: string, colour: string) {
  const marks: Record<string, string> = {
    Fuengirola:
      '<circle cx="0" cy="-5" r="3"/><path d="M-7 2Q-4-2-1 2T5 2M-7 6Q-4 2-1 6T5 6"/>',
    Málaga: '<path d="M-6 7V-5H-2V-8H2V-5H6V7M-2 7V1Q0-3 2 1V7"/>',
    Marbella: '<path d="M0 8V-5M-7-3Q-2-9 0-5Q4-9 8-4M-6 1Q-3-6 0-5Q4-5 6 1"/>',
    Granada:
      '<path d="M-2-4L-4-8L0-6L4-8L2-4M-5-3Q-9 6 0 8Q9 6 5-3Z"/><circle cx="0" cy="2" r="1.5"/>',
    Sevilla: '<path d="M0 7L-8-2Q-2-12 8-2ZM0 7V-7M0 7L-5-5M0 7L5-5"/>',
    Madrid: '<path d="M0-8L2-3L7-2L3 2L4 7L0 4L-4 7L-3 2L-7-2L-2-3Z"/>',
  };
  return `<g data-city-emblem="${escapeHtml(city)}"><path d="M151 185H171V202L161 208L151 202Z" fill="${trim}"/><g transform="translate(161 196) scale(.75)" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${marks[city] ?? marks.Madrid}</g></g>`;
}

function garment(d: Design) {
  const c = d.colour,
    t = d.trim;
  const p = (path: string, fill = c) => `<path d="${path}" fill="${fill}"/>`;
  const dot = (x: number, y: number, r: number, fill = t) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const seam = (path: string, width = 2, colour = t) =>
    `<path d="${path}" fill="none" stroke="${colour}" stroke-width="${width}"/>`;
  let drawing = "";
  switch (d.shape) {
    case "bucket":
      drawing =
        p("M87 83 Q87 52 130 52 Q171 52 174 83 L186 98 Q133 117 74 98Z") +
        p("M88 82 Q130 94 173 82 L179 95 Q128 108 81 96Z", t);
      break;
    case "cap":
      drawing =
        p("M87 93 Q79 54 124 52 Q165 52 172 91Z") +
        p("M96 88 Q132 80 172 88 L194 104 Q137 106 106 99Z", t) +
        dot(125, 71, 5);
      break;
    case "chef":
      drawing =
        p(
          "M94 91 L91 66 C61 65 67 32 89 34 C87 5 123 5 129 24 C153 2 180 23 166 45 C193 61 168 77 165 69 L164 92Z",
          "#fff8e5",
        ) + p("M94 76 L164 76 L164 94 Q130 103 94 94Z", t);
      break;
    case "phones":
      drawing =
        `<path d="M80 114 C64 32 190 29 181 113" fill="none" stroke="${c}" stroke-width="13"/>` +
        `<rect x="66" y="93" width="26" height="46" rx="11" fill="${c}"/><rect x="173" y="93" width="26" height="46" rx="11" fill="${c}"/>` +
        `<path d="M77 101V130M187 101V130" stroke="${t}" stroke-width="6"/>`;
      break;
    case "beret":
      drawing =
        p("M80 87 Q57 68 99 47 Q157 18 179 63 Q190 81 164 92Z") +
        p("M99 90 Q133 97 166 86 L164 100 L102 101Z", t) +
        p("M130 40L132 27L140 30L138 40Z");
      break;
    case "goggles":
      drawing = `<path d="M75 87 Q130 70 184 87" stroke="${c}" stroke-width="12" fill="none"/><rect x="82" y="65" width="43" height="37" rx="15" fill="${c}"/><rect x="133" y="65" width="43" height="37" rx="15" fill="${c}"/><path d="M124 79H134" stroke="${c}" stroke-width="8"/><rect x="90" y="72" width="26" height="21" rx="8" fill="${t}"/><rect x="141" y="72" width="26" height="21" rx="8" fill="${t}"/><path d="M94 85L107 76M145 85L158 76" stroke="#fff" stroke-width="4"/>`;
      break;
    case "band":
      drawing =
        p("M79 89 Q128 72 181 89 L181 106 Q130 91 79 106Z") +
        p("M164 100L185 122L193 108L180 96Z", t) +
        p("M120 89L137 89L130 103L122 103Z", t);
      break;
    case "flowers":
      drawing =
        `<path d="M77 91Q131 69 181 91" stroke="${c}" stroke-width="9" fill="none"/>` +
        [86, 108, 131, 153, 176]
          .map(
            (x, i) =>
              `<g transform="translate(${x} ${88 - Math.sin((i / 4) * Math.PI) * 11})"><path d="M0-12C9-18 14-5 8 0C21 9 4 20 0 9C-9 20-19 4-9 0C-20-9-5-19 0-12" fill="${t}" stroke-width="1.5"/><circle r="4" fill="#e8b956"/></g>`,
          )
          .join("");
      break;
    case "explorer":
      drawing =
        p("M92 87L96 50Q125 30 163 52L168 87Z") +
        p("M80 83Q120 97 177 81Q203 87 183 106Q134 118 76 105Q58 94 80 83Z") +
        p("M94 76Q130 87 167 76L169 87Q131 99 91 86Z", t);
      break;
    case "crown":
      drawing =
        p("M87 97L80 56L106 73L128 40L151 72L181 55L172 98Q130 112 87 97Z") +
        dot(129, 83, 7, "#b29bdd") +
        dot(94, 83, 4) +
        dot(164, 83, 4);
      break;
    case "jacket": {
      drawing = p(
        "M91 167L68 178L62 205L78 211L85 190L84 225Q130 240 178 225L176 191L183 211L200 205L193 178L169 167L150 175H110Z",
      );
      drawing +=
        p("M108 168Q130 185 151 168L157 174Q130 193 102 174Z", t) +
        p("M84 222Q130 237 178 222V231Q130 246 84 231Z", t) +
        seam("M130 184V233", 3) +
        seam("M101 203L94 215M160 203L168 215", 3) +
        seam("M66 200L79 205M184 205L197 201", 5) +
        `<path d="M87 226Q130 239 175 226" stroke="${c}" stroke-width="1.5" fill="none"/>` +
        `<rect x="127" y="192" width="6" height="9" rx="2" fill="${t}"/>`;
      if (d.id === "track-jacket")
        drawing += seam("M83 176L77 197M177 176L184 197", 4);
      if (d.id === "neon-bomber")
        drawing +=
          motif("moon", t, 158, 199, 0.65) +
          seam("M93 185L88 200M170 185L174 200", 2);
      break;
    }
    case "coat": {
      drawing = p(
        "M94 165L68 178L61 208L78 213L86 193L80 233Q130 252 181 233L175 191L184 213L201 207L194 177L166 165L149 173H110Z",
      );
      drawing +=
        p("M110 168H150L142 226H119Z", "#fff3d8") +
        p("M109 164L129 193L112 202L97 181Z", t) +
        p("M150 164L132 193L150 204L165 181Z", t) +
        seam("M131 193V240", 2) +
        seam("M91 209H114V222H91ZM151 210H172V222H151Z", 1.6) +
        dot(139, 211, 2.5) +
        dot(139, 225, 2.5) +
        seam("M65 204L78 209M184 209L197 204", 4);
      if (d.id === "chef-coat")
        drawing +=
          p("M111 188H151V229H111Z", c) +
          [198, 211, 223]
            .map((y) => dot(118, y, 2.5) + dot(143, y, 2.5))
            .join("") +
          seam("M112 188V229", 1.5);
      if (d.id === "artist-coat")
        drawing +=
          dot(99, 206, 4, "#9fc5bc") +
          dot(163, 224, 4, "#ca7363") +
          dot(94, 229, 2.5, "#d7bddb");
      break;
    }
    case "patch": {
      drawing = p(
        "M94 166L68 180L64 208L81 211L86 194L83 230Q130 245 179 230L176 194L181 211L199 207L193 179L168 166L149 175H110Z",
      );
      drawing +=
        p("M86 192H113V219H85Z", "#9cc9bf") +
        p("M139 176H168V201H139Z", t) +
        p("M136 213H178V230Q156 238 136 237Z", "#d99b91") +
        p("M107 168L129 188L151 168L157 176L132 199L101 176Z", t) +
        seam("M130 194V239", 2) +
        `<path d="M91 197H108V216H90M145 181H164V198M142 218H172V229" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="2 3"/>` +
        motif("star", c, 154, 190, 0.55);
      break;
    }
    case "vest": {
      drawing = p(
        "M91 168L68 179L62 203L79 210L88 191L85 226Q129 245 177 226L174 191L183 210L200 203L193 179L167 168Z",
        "#fff2d7",
      );
      drawing +=
        p(
          "M98 166L115 169L130 197L145 169L162 166L175 226L144 238L130 225L116 238L86 226Z",
        ) +
        p("M99 168L121 197L114 207L91 180Z", t) +
        p("M162 168L140 197L148 207L170 180Z", t) +
        seam("M130 197V225", 1.5) +
        dot(135, 210, 2.2) +
        dot(135, 221, 2.2) +
        seam("M94 214H113M149 214H168", 3);
      if (d.id === "host-vest")
        drawing += p("M116 174L130 180L145 174V188L130 182L116 188Z", t);
      break;
    }
    case "robe": {
      drawing = p(
        "M94 167L66 182L58 212L79 220L88 196L81 234Q130 254 181 234L173 196L181 220L203 212L193 181L165 167L145 176H113Z",
      );
      drawing +=
        p("M108 165L145 205L126 219L93 177Z", t) +
        p("M152 165L125 204L116 195L140 168Z", t) +
        `<path d="M86 214Q130 228 176 214" fill="none" stroke="${t}" stroke-width="10"/>` +
        p("M123 216L145 221L139 247L130 242L134 221L112 235L108 227Z", t) +
        seam("M61 209L79 216M182 216L200 209", 5) +
        seam("M94 227L92 234M167 228L169 233", 2);
      break;
    }
    case "apron":
      drawing =
        `<path d="M106 169V153Q130 142 153 155V172" fill="none" stroke="${t}" stroke-width="8"/>` +
        p("M101 166L159 166L178 225Q130 245 81 225Z") +
        p("M104 197L155 197L155 217Q131 228 104 217Z", t) +
        `<path d="M111 204H148" stroke="${c}"/>`;
      break;
    case "pack":
      drawing = `<rect x="61" y="153" width="139" height="73" rx="24" fill="${c}"/><path d="M93 159V140Q130 118 167 142V159" fill="none" stroke="${t}" stroke-width="9"/><rect x="57" y="176" width="24" height="39" rx="7" fill="${t}"/><rect x="183" y="176" width="22" height="39" rx="7" fill="${t}"/>`;
      break;
    case "brewer":
      drawing = `<rect x="59" y="152" width="146" height="73" rx="17" fill="${c}"/><rect x="174" y="128" width="26" height="65" rx="8" fill="${t}"/><path d="M187 128V112H204" fill="none" stroke="${c}" stroke-width="9"/><circle cx="71" cy="179" r="12" fill="${t}"/><path d="M71 180L76 174" stroke="${c}" stroke-width="3"/><path d="M62 204H202" stroke="${t}" stroke-width="5"/>`;
      break;
    case "tote":
      drawing = `<path d="M43 181V155C43 133 78 133 78 155V181" fill="none" stroke="${t}" stroke-width="7"/><path d="M34 170L86 170L87 230Q60 243 33 230Z" fill="${c}"/><path d="M40 177V226Q60 235 80 226V177" stroke="${t}" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>${motif("spark", t, 60, 204, 0.85)}`;
      break;
    case "wings":
      drawing =
        p("M115 185C51 72 5 124 48 180C0 180 37 244 113 207Z") +
        p("M146 185C211 72 257 124 214 180C262 180 225 244 149 207Z") +
        `<path d="M108 192L52 143M99 199L52 210M155 193L210 142M164 201L210 213" stroke="${t}" stroke-width="5"/>`;
      break;
    case "cup":
      drawing = `<g transform="rotate(-9 197 204)"><path d="M204 191C232 184 231 218 207 214" fill="none" stroke="${c}" stroke-width="9"/><path d="M179 183H211L208 220Q197 231 181 220Z" fill="${c}"/><path d="M179 187H211" stroke="${t}" stroke-width="4"/><path d="M189 194L201 194L201 210L189 210Z" fill="${t}"/><path d="M186 173C179 163 197 161 188 151M202 173C195 164 214 161 204 151" fill="none" stroke="${t}" stroke-width="3" opacity=".7"/></g>`;
      break;
    case "pan":
      drawing = `<path d="M176 215L204 187" stroke="${c}" stroke-width="11"/><ellipse cx="213" cy="178" rx="28" ry="24" fill="${c}"/><ellipse cx="213" cy="175" rx="20" ry="16" fill="${t}"/><path d="M206 166L214 163" stroke="#fff5c3" stroke-width="4"/>`;
      break;
    case "tray":
      drawing = `<ellipse cx="199" cy="209" rx="43" ry="12" fill="${c}"/><ellipse cx="199" cy="204" rx="40" ry="9" fill="${t}"/><path d="M176 201L190 181L203 201Z" fill="#e6b75d"/><circle cx="213" cy="196" r="9" fill="#bd7155"/><circle cx="212" cy="192" r="3" fill="#7c9f60"/>`;
      break;
    case "mic":
      drawing = `<path d="M181 219L209 174" stroke="${c}" stroke-width="13"/><ellipse cx="212" cy="169" rx="16" ry="19" transform="rotate(31 212 169)" fill="${t}"/><path d="M201 167L222 176M205 159L226 168" stroke="${c}" stroke-width="2"/><path d="M182 220Q166 244 191 251" fill="none" stroke="${c}" stroke-width="3"/>`;
      break;
    case "book":
      drawing = `<g transform="rotate(13 195 198)"><rect x="173" y="172" width="45" height="59" rx="4" fill="${c}"/><path d="M181 177H212V223H181Z" fill="${t}"/><path d="M181 201L193 187L211 208M184 214H207" fill="none" stroke="${c}" stroke-width="2"/><path d="M173 174V230" stroke="${t}" stroke-width="3"/></g>`;
      break;
    case "camera":
      drawing = `<path d="M175 185L182 176H201L207 185" fill="${c}"/><rect x="167" y="184" width="59" height="40" rx="8" fill="${c}"/><circle cx="197" cy="204" r="14" fill="${t}"/><circle cx="197" cy="204" r="8" fill="#436476"/><circle cx="199" cy="202" r="3" fill="#fff2cf"/><path d="M175 193H180" stroke="${t}" stroke-width="4"/>`;
      break;
    case "flag":
      drawing = `<path d="M188 230V139" stroke="${t}" stroke-width="7"/><path d="M190 143L235 160L190 177Z" fill="${c}"/><path d="M197 154L209 160L197 166Z" fill="${t}"/>`;
      break;
    case "staff":
      drawing = `<path d="M192 247L198 116Q212 91 220 112" fill="none" stroke="${c}" stroke-width="9"/><path d="M199 143Q173 129 179 113Q204 108 205 136" fill="${t}"/><path d="M196 184L204 185M195 194L203 195" stroke="${t}" stroke-width="5"/>`;
      break;
  }
  if (d.slot === "body" && d.city) drawing += cityBadge(d.city, t, c);
  const signature = families.find((family) => d.id.startsWith(`${family.id}-`));
  if (signature && d.slot === "body")
    drawing += motif(familyStyles[signature.id].motif, t, 157, 199, 0.62);
  if (d.shape === "bucket")
    drawing +=
      seam("M91 76Q131 87 170 76", 1.2) + seam("M84 100Q132 112 178 99", 1.2);
  if (d.shape === "cap")
    drawing += seam("M126 55Q137 70 137 85", 1.2) + dot(123, 54, 4);
  if (d.shape === "beret")
    drawing += seam("M83 76Q77 63 98 55", 2.5, "#fff2df");
  if (d.shape === "apron")
    drawing +=
      seam("M108 201H151V215Q130 222 108 215Z", 1.3, c) +
      p("M149 200L165 201L165 227L150 226Z", "#fff0d4") +
      seam("M156 202V223M161 202V223", 1.5);
  if (d.shape === "pack")
    drawing += `<rect x="80" y="127" width="102" height="24" rx="12" fill="${t}"/><path d="M103 128V150M158 128V150" stroke="${c}" stroke-width="6"/><path d="M63 193H77M187 193H199" stroke="${c}" stroke-width="2"/>`;
  if (d.shape === "book")
    drawing += `<path d="M205 173L210 174L208 188L204 183Z" fill="#a0c4af"/>`;
  return `<g data-design="${escapeHtml(d.id)}" data-garment="${escapeHtml(d.shape)}" stroke="#4a454b" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}
export function itemSvg(d: Design) {
  const boxes = {
    head: "50 0 155 135",
    body: "57 144 150 105",
    back: "19 104 225 145",
    held: "149 95 99 166",
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boxes[d.slot]}" role="img" aria-label="${escapeHtml(d.name)}">${garment(d)}</svg>`;
}

function expression(family: Family) {
  const dark = "#353a49";
  const gaze = (x: number, y = 139, width = 6, height = 8) =>
    `<ellipse cx="${x}" cy="${y}" rx="${width}" ry="${height}" fill="${dark}"/><circle cx="${x + 1.8}" cy="${y - 3}" r="2.2" fill="#fff8e9"/>`;
  const line = (path: string, width = 3) =>
    `<path d="${path}" stroke="${dark}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
  const smile = line("M121 156Q130 165 139 156");
  const faces: Record<Family, string> = {
    brasa: `${gaze(109)}${gaze(153)}${line("M99 123L116 126M146 126L163 123", 2.5)}<path d="M117 155Q130 159 144 155Q138 174 127 170Q120 168 117 155Z" fill="${dark}"/><path d="M121 158H140L136 161H124Z" fill="#fff4d9"/>`,
    moka: `${gaze(109, 142, 6, 6)}${gaze(153, 142, 6, 6)}<path d="M98 134H120M142 134H165" stroke="#895f50" stroke-width="5" stroke-linecap="round"/>${line("M126 160Q132 163 138 157", 2.5)}`,
    tapo: `${line("M101 140Q109 129 117 140M145 140Q153 129 161 140", 4.5)}<path d="M120 157Q131 164 143 156Q137 173 127 169Z" fill="${dark}"/><path d="M126 166Q132 161 138 165L135 168Z" fill="#e99891"/>`,
    lux: `${gaze(109, 140, 7, 10)}${gaze(153, 140, 7, 10)}${line("M101 131L97 128M161 131L165 128", 2.5)}${smile}${motif("spark", "#fff4db", 111, 137, 0.23)}${motif("spark", "#fff4db", 155, 137, 0.23)}`,
    musa: `${gaze(109, 140, 5.5, 7.5)}${gaze(153, 140, 5.5, 7.5)}${line("M99 125Q107 120 116 124M147 123L160 126", 2.5)}${line("M124 160Q131 166 141 155", 2.7)}`,
    lupa: `${gaze(108, 138, 7, 9)}${gaze(154, 138, 7, 9)}${line("M98 120L116 126M146 126L164 120", 3)}<path d="M123 151L138 151L130 160Z" fill="#edbd75" stroke="#76604b" stroke-width="1.5"/>${line("M126 165Q130 168 135 165", 2)}`,
    rayo: `${gaze(109, 140, 5.5, 8.5)}${gaze(153, 140, 5.5, 8.5)}${line("M100 125L116 129M146 129L162 123", 3)}<path d="M120 155Q132 161 144 154L140 165H125Z" fill="#fff5da" stroke="${dark}" stroke-width="2.5"/>`,
    nube: `${line("M100 139Q109 148 118 139M145 139Q154 148 163 139", 4)}${line("M106 145L104 148M155 145L157 148", 2)}${line("M126 159Q131 163 136 159", 2.5)}`,
    chispa: `${gaze(109, 138, 7, 9)}${gaze(153, 138, 7, 9)}<path d="M118 155Q131 162 145 155Q143 173 131 173Q120 172 118 155Z" fill="${dark}"/><path d="M123 167Q131 162 140 167Q137 172 131 172Q126 172 123 167Z" fill="#ed9997"/>`,
    brote: `${gaze(109, 140, 5.5, 8)}${gaze(153, 140, 5.5, 8)}${line("M102 126Q109 122 116 126M146 126Q153 122 160 126", 2.5)}${smile}<g fill="#8e9363"><circle cx="96" cy="152" r="1.6"/><circle cx="101" cy="154" r="1.5"/><circle cx="164" cy="154" r="1.5"/><circle cx="169" cy="152" r="1.6"/></g>`,
  };
  return `<g data-expression="${family}">${faces[family]}</g>`;
}

export function palSvg(
  familyId: Family,
  outfit: string[] = [],
  prefix = "pal",
  master = false,
) {
  const f = families.find((f) => f.id === familyId)!;
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, "") || "pal";
  const layers = outfit.map(getDesign);
  const layer = (slot: string) =>
    `<g data-layer="${slot}">${layers
      .filter((d) => d.slot === slot)
      .map(garment)
      .join("")}</g>`;
  let silhouette =
    "M72 149C65 83 93 70 128 71C173 68 194 99 190 153C210 185 193 235 133 241C76 244 49 204 72 149Z";
  let accents = "",
    behind = "";
  switch (familyId) {
    case "brasa":
      silhouette =
        "M70 151C63 116 94 97 101 70C107 84 108 96 110 95C108 59 138 41 135 22C164 59 180 74 179 104C210 137 200 190 181 217C155 255 83 246 63 207C52 184 61 164 70 151Z";
      accents = `<path d="M99 117Q118 86 127 79Q124 107 141 117" fill="#ffe2a5" opacity=".65"/>`;
      break;
    case "moka":
      silhouette =
        "M67 150C59 108 74 71 117 68C162 51 198 85 194 139C205 191 183 234 140 241C88 250 51 212 67 150Z";
      accents = `<path d="M138 75C118 89 117 104 127 114" fill="none" stroke="#785543" stroke-width="6" opacity=".6"/><path d="M148 77C136 84 128 94 129 103" stroke="#fff1d1" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" fill="none"/>`;
      break;
    case "tapo":
      behind = `<path d="M130 77C102 56 111 28 146 49C155 60 138 70 130 77Z" fill="#739357" stroke="#496c4d" stroke-width="3"/>`;
      accents = `<ellipse cx="131" cy="91" rx="16" ry="10" fill="#ce8263" opacity=".9"/><ellipse cx="127" cy="88" rx="6" ry="3" fill="#ffe0a2" opacity=".7"/>`;
      break;
    case "lux":
      behind = `<path d="M88 181C-7 76 10 229 80 224M173 181C268 76 251 229 182 224" fill="#b9b0e5" stroke="#76648c" stroke-width="3"/><path d="M72 182Q25 132 41 181Q49 210 70 214" fill="none" stroke="#e4d4ff" stroke-width="5"/><path d="M186 180Q228 137 219 181Q212 212 188 215" fill="none" stroke="#e4d4ff" stroke-width="5"/><path d="M104 90Q77 51 72 61M155 86Q180 48 189 59" fill="none" stroke="#7b629c" stroke-width="5"/><circle cx="71" cy="60" r="8" fill="#d6efa5"/><circle cx="188" cy="58" r="8" fill="#d6efa5"/>`;
      break;
    case "musa":
      silhouette =
        "M80 103Q84 67 120 65L150 66Q184 74 186 107L185 166Q202 200 173 227Q126 252 80 228Q53 205 70 169Z";
      accents = `<path d="M126 135L121 153L132 156" fill="none" stroke="#ae8175" stroke-width="3"/><circle cx="94" cy="114" r="3" fill="#d19f8b"/><circle cx="163" cy="175" r="2" fill="#d19f8b"/>`;
      break;
    case "lupa":
      behind = `<path d="M106 87L104 48L130 74L147 45L158 88Z" fill="${f.colour}" stroke="#4a5c69" stroke-width="3"/>`;
      accents = `<path d="M80 123C87 97 117 99 130 120C143 99 175 99 181 123C193 151 160 178 130 161C100 179 70 151 80 123Z" fill="#f0ecd6" opacity=".9"/><path d="M74 176L79 193L68 198M189 178L182 193L194 196" fill="none" stroke="#476b79" stroke-width="4" stroke-linecap="round"/>`;
      break;
    case "rayo":
      behind = `<path d="M92 105C88 71 60 38 73 22C89 5 111 57 117 96M145 97C155 57 157 7 178 13C198 22 181 71 173 108" fill="${f.colour}" stroke="#8f795b" stroke-width="3"/><path d="M101 86C93 65 74 34 79 28M161 83Q185 24 176 21" fill="none" stroke="#e99d63" stroke-width="7" stroke-linecap="round"/><path d="M184 218C203 197 231 203 224 224C219 240 197 245 186 231Z" fill="#f3cf67" stroke="#8f795b" stroke-width="3"/>`;
      break;
    case "nube":
      silhouette =
        "M74 149C45 125 66 86 92 92C84 55 137 47 148 76C179 53 201 84 187 112C219 123 209 159 193 167C214 201 190 236 160 233C139 256 107 244 101 235C64 247 39 211 58 187C43 166 57 148 74 149Z";
      break;
    case "chispa":
      behind = `<path d="M79 128C55 129 40 111 43 108C52 102 55 121 66 120C40 132 25 125 26 135C26 143 48 138 65 142C44 146 36 153 41 160C45 169 64 148 79 152M180 128C204 129 219 111 216 108C207 102 204 121 193 120C219 132 234 125 233 135C233 143 211 138 194 142C215 146 223 153 218 160C214 169 195 148 180 152" fill="#e78485" stroke="#9d626e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      accents = `<path d="M128 89L132 98L142 99L134 105L136 115L128 110L120 115L122 105L114 99L124 98Z" fill="#fff1b7"/>`;
      break;
    case "brote":
      behind = `<path d="M130 92L132 43" fill="none" stroke="#547d51" stroke-width="6"/><path d="M131 64C92 69 84 31 96 32C121 27 135 46 131 64Z" fill="#7aa877" stroke="#547d51" stroke-width="3"/><path d="M133 50C132 18 171 13 169 28C167 47 150 56 133 50Z" fill="#a7ce8d" stroke="#547d51" stroke-width="3"/>`;
      accents = `<path d="M130 84Q141 101 135 119" fill="none" stroke="#5f8758" stroke-width="3" opacity=".5"/>`;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 275" role="img" aria-label="${escapeHtml(f.name)}${master ? " master outfit" : " companion"}"><defs><linearGradient id="${id}-skin" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="${f.light}"/><stop offset=".5" stop-color="${f.colour}" stop-opacity=".85"/><stop offset="1" stop-color="${f.colour}"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="${f.light}" stop-opacity=".8"/><stop offset="1" stop-color="${f.light}" stop-opacity="0"/></radialGradient><clipPath id="${id}-body"><path d="${silhouette}"/></clipPath></defs>${master ? `<circle cx="130" cy="144" r="115" fill="url(#${id}-glow)"/>${motif(familyStyles[f.id].motif, f.colour, 39, 75, 0.7)}${motif("spark", f.colour, 215, 62, 0.6)}` : ""}<ellipse cx="130" cy="257" rx="63" ry="8" fill="#282839" opacity=".1"/><ellipse cx="130" cy="256" rx="43" ry="4" fill="#282839" opacity=".08"/>${behind}${layer("back")}<g stroke="#59515a" stroke-opacity=".6" stroke-width="2.7"><ellipse cx="102" cy="245" rx="21" ry="12" fill="${f.colour}"/><ellipse cx="157" cy="245" rx="21" ry="12" fill="${f.colour}"/><path d="${silhouette}" fill="url(#${id}-skin)"/><ellipse cx="66" cy="183" rx="13" ry="22" transform="rotate(22 66 183)" fill="${f.colour}"/><ellipse cx="194" cy="183" rx="13" ry="22" transform="rotate(-22 194 183)" fill="${f.colour}"/></g><g clip-path="url(#${id}-body)" pointer-events="none"><ellipse cx="104" cy="101" rx="44" ry="34" fill="#fff9e2" opacity=".2"/><path d="M57 192Q135 254 202 177L207 257H54Z" fill="#424557" opacity=".07"/><path d="M80 113Q77 92 96 86" stroke="#fff9e5" stroke-width="6" stroke-linecap="round" fill="none" opacity=".5"/></g>${accents}${layer("body")}<ellipse cx="91" cy="155" rx="10" ry="5" fill="#e89b91" opacity=".48"/><ellipse cx="171" cy="155" rx="10" ry="5" fill="#e89b91" opacity=".48"/>${expression(familyId)}${layer("head")}${layer("held")}</svg>`;
}
export function statePortrait(s: State, prefix = "current") {
  return palSvg(
    s.family ?? "moka",
    Object.values(s.equipped).flatMap((id) => {
      const item = s.equipment.find((i) => i.id === id);
      return item ? [item.appearance] : [];
    }),
    prefix,
  );
}
