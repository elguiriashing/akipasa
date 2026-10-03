import { families, getDesign, type Design, type Family, type State } from "./engine";

/** Original layered vector artwork; no stock assets, brand crests, fonts or remote images. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
function garment(d: Design) {
  const c = d.colour, t = d.trim;
  const p = (path: string, fill = c) => `<path d="${path}" fill="${fill}"/>`;
  const dot = (x: number, y: number, r: number, fill = t) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  let drawing = "";
  switch (d.shape) {
    case "bucket": drawing = p("M87 83 Q87 52 130 52 Q171 52 174 83 L186 98 Q133 117 74 98Z") + p("M88 82 Q130 94 173 82 L179 95 Q128 108 81 96Z", t); break;
    case "cap": drawing = p("M87 93 Q79 54 124 52 Q165 52 172 91Z") + p("M96 88 Q132 80 172 88 L194 104 Q137 106 106 99Z", t) + dot(125,71,5); break;
    case "chef": drawing = p("M94 91 L91 66 C61 65 67 32 89 34 C87 5 123 5 129 24 C153 2 180 23 166 45 C193 61 168 77 165 69 L164 92Z", "#fff8e5") + p("M94 76 L164 76 L164 94 Q130 103 94 94Z", t); break;
    case "phones": drawing = `<path d="M80 114 C64 32 190 29 181 113" fill="none" stroke="${c}" stroke-width="13"/>` + `<rect x="66" y="93" width="26" height="46" rx="11" fill="${c}"/><rect x="173" y="93" width="26" height="46" rx="11" fill="${c}"/>` + `<path d="M77 101V130M187 101V130" stroke="${t}" stroke-width="6"/>`; break;
    case "beret": drawing = p("M80 87 Q57 68 99 47 Q157 18 179 63 Q190 81 164 92Z") + p("M99 90 Q133 97 166 86 L164 100 L102 101Z", t) + p("M130 40L132 27L140 30L138 40Z"); break;
    case "goggles": drawing = `<path d="M75 87 Q130 70 184 87" stroke="${c}" stroke-width="12" fill="none"/><rect x="82" y="65" width="43" height="37" rx="15" fill="${c}"/><rect x="133" y="65" width="43" height="37" rx="15" fill="${c}"/><path d="M124 79H134" stroke="${c}" stroke-width="8"/><rect x="90" y="72" width="26" height="21" rx="8" fill="${t}"/><rect x="141" y="72" width="26" height="21" rx="8" fill="${t}"/><path d="M94 85L107 76M145 85L158 76" stroke="#fff" stroke-width="4"/>`; break;
    case "band": drawing = p("M79 89 Q128 72 181 89 L181 106 Q130 91 79 106Z") + p("M164 100L185 122L193 108L180 96Z", t) + p("M120 89L137 89L130 103L122 103Z", t); break;
    case "flowers": drawing = `<path d="M77 91Q131 69 181 91" stroke="${c}" stroke-width="9" fill="none"/>` + [86,108,131,153,176].map((x, i) => `<g transform="translate(${x} ${88-Math.sin(i/4*Math.PI)*11})"><path d="M0-12C9-18 14-5 8 0C21 9 4 20 0 9C-9 20-19 4-9 0C-20-9-5-19 0-12" fill="${t}" stroke-width="1.5"/><circle r="4" fill="#e8b956"/></g>`).join(""); break;
    case "explorer": drawing = p("M92 87L96 50Q125 30 163 52L168 87Z") + p("M80 83Q120 97 177 81Q203 87 183 106Q134 118 76 105Q58 94 80 83Z") + p("M94 76Q130 87 167 76L169 87Q131 99 91 86Z", t); break;
    case "crown": drawing = p("M87 97L80 56L106 73L128 40L151 72L181 55L172 98Q130 112 87 97Z") + dot(129,83,7,"#b29bdd") + dot(94,83,4) + dot(164,83,4); break;
    case "jacket": case "coat": case "patch": case "vest": case "robe": {
      drawing = p("M88 167L64 178L73 205L84 199L84 226Q132 249 177 225L176 199L188 206L199 179L174 166L151 174L109 174Z");
      drawing += p("M109 170L129 192L150 170L141 166L130 180L118 166Z",t);
      drawing += `<path d="M130 190V234" stroke="${t}" stroke-width="3"/>`;
      drawing += p("M91 204L113 204L113 219Q101 224 91 217Z", t) + dot(146,206,3) + dot(146,219,3);
      if(d.shape === "patch") drawing += `<rect x="148" y="187" width="20" height="21" rx="3" fill="#8ccbc7"/><path d="M151 197L165 197M158 190V204" stroke="${t}"/>`;
      if(d.shape === "robe") drawing += `<path d="M84 219Q130 209 179 219" stroke="${t}" stroke-width="9"/><path d="M127 215L139 240L149 234L132 217" fill="${t}"/>`;
      if(d.shape === "vest") drawing += `<path d="M121 179L130 184L140 178V191L130 186L121 192Z" fill="${t}"/>`;
      if(d.city) drawing += `<path d="M151 187L167 187L167 198L159 203L151 198Z" fill="${t}"/><path d="M154 193H164" stroke="${c}" stroke-width="2"/>`;
      break;
    }
    case "apron": drawing = `<path d="M106 169V153Q130 142 153 155V172" fill="none" stroke="${t}" stroke-width="8"/>` + p("M101 166L159 166L178 225Q130 245 81 225Z") + p("M104 197L155 197L155 217Q131 228 104 217Z",t) + `<path d="M111 204H148" stroke="${c}"/>`; break;
    case "pack": drawing = `<rect x="61" y="153" width="139" height="73" rx="24" fill="${c}"/><path d="M93 159V140Q130 118 167 142V159" fill="none" stroke="${t}" stroke-width="9"/><rect x="57" y="176" width="24" height="39" rx="7" fill="${t}"/><rect x="183" y="176" width="22" height="39" rx="7" fill="${t}"/>`; break;
    case "brewer": drawing = `<rect x="59" y="152" width="146" height="73" rx="17" fill="${c}"/><rect x="174" y="128" width="26" height="65" rx="8" fill="${t}"/><path d="M187 128V112H204" fill="none" stroke="${c}" stroke-width="9"/><circle cx="71" cy="179" r="12" fill="${t}"/><path d="M71 180L76 174" stroke="${c}" stroke-width="3"/><path d="M62 204H202" stroke="${t}" stroke-width="5"/>`; break;
    case "tote": drawing = `<path d="M169 177V146C169 124 204 124 204 146V178" fill="none" stroke="${t}" stroke-width="7"/><path d="M164 163L212 163L213 229Q187 241 164 227Z" fill="${c}"/><path d="M178 195L194 177L201 184L185 203Z" fill="${t}"/>`; break;
    case "wings": drawing = p("M115 185C51 72 5 124 48 180C0 180 37 244 113 207Z") + p("M146 185C211 72 257 124 214 180C262 180 225 244 149 207Z") + `<path d="M108 192L52 143M99 199L52 210M155 193L210 142M164 201L210 213" stroke="${t}" stroke-width="5"/>`; break;
    case "cup": drawing = `<g transform="rotate(-9 197 204)"><path d="M204 191C232 184 231 218 207 214" fill="none" stroke="${c}" stroke-width="9"/><path d="M179 183H211L208 220Q197 231 181 220Z" fill="${c}"/><path d="M179 187H211" stroke="${t}" stroke-width="4"/><path d="M189 194L201 194L201 210L189 210Z" fill="${t}"/><path d="M186 173C179 163 197 161 188 151M202 173C195 164 214 161 204 151" fill="none" stroke="${t}" stroke-width="3" opacity=".7"/></g>`; break;
    case "pan": drawing = `<path d="M176 215L204 187" stroke="${c}" stroke-width="11"/><ellipse cx="213" cy="178" rx="28" ry="24" fill="${c}"/><ellipse cx="213" cy="175" rx="20" ry="16" fill="${t}"/><path d="M206 166L214 163" stroke="#fff5c3" stroke-width="4"/>`; break;
    case "tray": drawing = `<ellipse cx="199" cy="209" rx="43" ry="12" fill="${c}"/><ellipse cx="199" cy="204" rx="40" ry="9" fill="${t}"/><path d="M176 201L190 181L203 201Z" fill="#e6b75d"/><circle cx="213" cy="196" r="9" fill="#bd7155"/><circle cx="212" cy="192" r="3" fill="#7c9f60"/>`; break;
    case "mic": drawing = `<path d="M181 219L209 174" stroke="${c}" stroke-width="13"/><ellipse cx="212" cy="169" rx="16" ry="19" transform="rotate(31 212 169)" fill="${t}"/><path d="M201 167L222 176M205 159L226 168" stroke="${c}" stroke-width="2"/><path d="M182 220Q166 244 191 251" fill="none" stroke="${c}" stroke-width="3"/>`; break;
    case "book": drawing = `<g transform="rotate(13 195 198)"><rect x="173" y="172" width="45" height="59" rx="4" fill="${c}"/><path d="M181 177H212V223H181Z" fill="${t}"/><path d="M181 201L193 187L211 208M184 214H207" fill="none" stroke="${c}" stroke-width="2"/><path d="M173 174V230" stroke="${t}" stroke-width="3"/></g>`; break;
    case "camera": drawing = `<path d="M175 185L182 176H201L207 185" fill="${c}"/><rect x="167" y="184" width="59" height="40" rx="8" fill="${c}"/><circle cx="197" cy="204" r="14" fill="${t}"/><circle cx="197" cy="204" r="8" fill="#436476"/><circle cx="199" cy="202" r="3" fill="#fff2cf"/><path d="M175 193H180" stroke="${t}" stroke-width="4"/>`; break;
    case "flag": drawing = `<path d="M188 230V139" stroke="${t}" stroke-width="7"/><path d="M190 143L235 160L190 177Z" fill="${c}"/><path d="M197 154L209 160L197 166Z" fill="${t}"/>`; break;
    case "staff": drawing = `<path d="M192 247L198 116Q212 91 220 112" fill="none" stroke="${c}" stroke-width="9"/><path d="M199 143Q173 129 179 113Q204 108 205 136" fill="${t}"/><path d="M196 184L204 185M195 194L203 195" stroke="${t}" stroke-width="5"/>`; break;
  }
  return `<g stroke="#4a454b" stroke-opacity=".62" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>`;
}
export function itemSvg(d: Design) {
  const boxes = { head: "50 0 155 135", body: "57 144 150 105", back: "19 104 225 145", held: "149 95 99 166" };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boxes[d.slot]}" role="img" aria-label="${escapeHtml(d.name)}">${garment(d)}</svg>`;
}
export function palSvg(familyId: Family, outfit: string[] = [], prefix = "pal", master = false) {
  const f = families.find((f) => f.id === familyId)!;
  const id = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
  const layers = outfit.map(getDesign);
  const layer = (slot: string) => layers.filter((d) => d.slot === slot).map(garment).join("");
  let silhouette = "M72 149C65 83 93 70 128 71C173 68 194 99 190 153C210 185 193 235 133 241C76 244 49 204 72 149Z";
  let accents = "", behind = "";
  switch (familyId) {
    case "brasa": silhouette = "M70 151C63 116 94 97 101 70C107 84 108 96 110 95C108 59 138 41 135 22C164 59 180 74 179 104C210 137 200 190 181 217C155 255 83 246 63 207C52 184 61 164 70 151Z"; accents = `<path d="M99 117Q118 86 127 79Q124 107 141 117" fill="#ffe2a5" opacity=".65"/>`; break;
    case "moka": silhouette = "M67 150C59 108 74 71 117 68C162 51 198 85 194 139C205 191 183 234 140 241C88 250 51 212 67 150Z"; accents = `<path d="M137 73Q113 94 125 113" fill="none" stroke="#785543" stroke-width="6" opacity=".65"/>`; break;
    case "tapo": behind = `<path d="M130 77C102 56 111 28 146 49C155 60 138 70 130 77Z" fill="#739357" stroke="#496c4d" stroke-width="3"/>`; accents = `<ellipse cx="131" cy="91" rx="16" ry="10" fill="#d07b61" opacity=".85"/>`; break;
    case "lux": behind = `<path d="M88 181C-7 76 10 229 80 224M173 181C268 76 251 229 182 224" fill="#b9b0e5" stroke="#76648c" stroke-width="3"/><path d="M104 90Q77 51 72 61M155 86Q180 48 189 59" fill="none" stroke="#7b629c" stroke-width="5"/><circle cx="71" cy="60" r="8" fill="#d6efa5"/><circle cx="188" cy="58" r="8" fill="#d6efa5"/>`; break;
    case "musa": silhouette = "M80 103Q84 67 120 65L150 66Q184 74 186 107L185 166Q202 200 173 227Q126 252 80 228Q53 205 70 169Z"; accents = `<path d="M126 135L121 153L132 156" fill="none" stroke="#ae8175" stroke-width="3"/><circle cx="94" cy="114" r="3" fill="#d19f8b"/><circle cx="163" cy="175" r="2" fill="#d19f8b"/>`; break;
    case "lupa": behind = `<path d="M106 87L104 48L130 74L147 45L158 88Z" fill="${f.colour}" stroke="#4a5c69" stroke-width="3"/>`; accents = `<path d="M121 150L140 150L130 160Z" fill="#e7b370" stroke="#74604f" stroke-width="2"/><path d="M73 174Q51 182 66 203" fill="#476b79"/>`; break;
    case "rayo": behind = `<path d="M91 104L67 47L84 53L78 15L107 51L97 49L118 94M146 94L159 38L170 44L182 11L184 60L174 55L171 111" fill="${f.colour}" stroke="#8f795b" stroke-width="3"/><path d="M186 206L222 181L213 209L234 210L189 239Z" fill="#f3cf67" stroke="#8f795b" stroke-width="3"/>`; break;
    case "nube": silhouette = "M74 149C45 125 66 86 92 92C84 55 137 47 148 76C179 53 201 84 187 112C219 123 209 159 193 167C214 201 190 236 160 233C139 256 107 244 101 235C64 247 39 211 58 187C43 166 57 148 74 149Z"; break;
    case "chispa": behind = `<path d="M78 132L44 113L49 135L27 142L76 154M180 132L213 113L209 135L233 144L182 155" fill="#e78485" stroke="#9d626e" stroke-width="3"/>`; accents = `<path d="M128 89L132 98L142 99L134 105L136 115L128 110L120 115L122 105L114 99L124 98Z" fill="#fff1b7"/>`; break;
    case "brote": behind = `<path d="M130 92L132 43" fill="none" stroke="#547d51" stroke-width="6"/><path d="M131 64C92 69 84 31 96 32C121 27 135 46 131 64Z" fill="#7aa877" stroke="#547d51" stroke-width="3"/><path d="M133 50C132 18 171 13 169 28C167 47 150 56 133 50Z" fill="#a7ce8d" stroke="#547d51" stroke-width="3"/>`; accents = `<path d="M130 84Q141 101 135 119" fill="none" stroke="#5f8758" stroke-width="3" opacity=".5"/>`; break;
  }
  const sleepy = familyId === "moka" || familyId === "nube";
  const eyes = sleepy ? `<path d="M99 140Q108 148 117 140M144 140Q153 148 162 140" fill="none" stroke="#47404a" stroke-width="5" stroke-linecap="round"/>` : `<ellipse cx="109" cy="140" rx="6" ry="9" fill="#45404b"/><ellipse cx="153" cy="140" rx="6" ry="9" fill="#45404b"/><circle cx="111" cy="137" r="2" fill="#fff6dd"/><circle cx="155" cy="137" r="2" fill="#fff6dd"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 275" role="img" aria-label="${escapeHtml(f.name)}${master ? " master outfit" : " companion"}"><defs><linearGradient id="${id}-skin" x1="0" y1="0" x2=".75" y2="1"><stop stop-color="${f.light}"/><stop offset="1" stop-color="${f.colour}"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="#fff9cd" stop-opacity=".5"/><stop offset="1" stop-color="#fff9cd" stop-opacity="0"/></radialGradient></defs>${master ? `<circle cx="130" cy="144" r="115" fill="url(#${id}-glow)"/><path d="M36 72L40 61L44 72L55 76L44 80L40 91L36 80L25 76M208 58L212 49L216 58L225 62L216 66L212 75L208 66L199 62" fill="#efd089"/>` : ""}<ellipse cx="130" cy="256" rx="65" ry="9" fill="#282839" opacity=".13"/>${behind}${layer("back")}<g stroke="#59515a" stroke-opacity=".6" stroke-width="3"><ellipse cx="102" cy="246" rx="21" ry="12" fill="${f.colour}"/><ellipse cx="157" cy="246" rx="21" ry="12" fill="${f.colour}"/><path d="${silhouette}" fill="url(#${id}-skin)"/><ellipse cx="66" cy="183" rx="13" ry="22" transform="rotate(22 66 183)" fill="${f.colour}"/><ellipse cx="194" cy="183" rx="13" ry="22" transform="rotate(-22 194 183)" fill="${f.colour}"/></g>${accents}${layer("body")}<ellipse cx="91" cy="155" rx="10" ry="5" fill="#e89b91" opacity=".48"/><ellipse cx="171" cy="155" rx="10" ry="5" fill="#e89b91" opacity=".48"/>${eyes}<path d="M121 157Q130 166 139 157" stroke="#655058" stroke-width="3" fill="none" stroke-linecap="round"/>${layer("head")}${layer("held")}</svg>`;
}
export function statePortrait(s: State, prefix = "current") {
  return palSvg(s.family ?? "moka", Object.values(s.equipped).flatMap((id) => { const item = s.equipment.find((i) => i.id === id); return item ? [item.appearance] : []; }), prefix);
}
