import { APPEARANCE_OPTIONS } from "@/lib/pals/avatar-v2";
const SPANISH: Record<string, string> = {
  "AkiPals | Wardrobe": "AkiPals | Armario",
  "AkiPals / Wardrobe": "AkiPals / Armario",
  "Your Wardrobe.": "Tu armario.",
  Character: "Personaje",
  "Character model": "Modelo de personaje",
  "Classic saved look": "Aspecto clásico guardado",
  "Choose your character and save the look you want to take into AkiWorld.":
    "Elige tu personaje y guarda el aspecto que quieres llevar a AkiWorld.",
  "Rain and Snow include their original hairstyle and outfit. You can choose a character and adjust its height.":
    "Rain y Snow incluyen su peinado y ropa originales. Puedes elegir un personaje y ajustar su altura.",
  "These character previews use a standing pose.":
    "Estas vistas del personaje usan una pose de pie.",
  "Your classic styling choices stay available when you switch back to Classic saved look.":
    "Tus opciones de estilo clásicas siguen disponibles al volver a Aspecto clásico guardado.",
  "Character credits": "Créditos de personajes",
  "Private AkiPals Wardrobe · Free starter characters · No payments · No location sharing from this screen":
    "Armario privado de AkiPals · Personajes iniciales gratis · Sin pagos · Esta pantalla no comparte tu ubicación",
  "Enter the private AkiPals World prototype":
    "Entrar en el prototipo privado de AkiPals World",
  "Enter AkiWorld": "Entrar en AkiWorld",
  "This is your Wardrobe. Create the character who explores AkiWorld, customise every detail and save your look to carry into the game.":
    "Este es tu armario. Crea el personaje con el que explorarás AkiWorld, personaliza cada detalle y guarda tu aspecto para llevarlo al juego.",
  "Make this 3D character yours. Your saved appearance is reused on the AkiWorld map.":
    "Personaliza tu personaje 3D. Tu aspecto guardado se reutiliza en el mapa de AkiWorld.",
  "Your look goes exploring": "Tu estilo sale a explorar",
  "Private AkiPals Wardrobe · CC0 character bases · No payments · No location sharing from this screen":
    "Armario privado de AkiPals · Bases de personaje CC0 · Sin pagos · Esta pantalla no comparte tu ubicación",
  Face: "Rostro",
  Hair: "Pelo",
  Body: "Cuerpo",
  Outfit: "Ropa",
  Extras: "Accesorios",
  Hairstyle: "Peinado",
  "Hair colour": "Color de pelo",
  "Body frame": "Complexión",
  "Skin tone": "Tono de piel",
  "Face shape": "Forma de la cara",
  "Eye shape": "Forma de los ojos",
  "Eye colour": "Color de ojos",
  Eyebrows: "Cejas",
  Nose: "Nariz",
  Mouth: "Boca",
  Ears: "Orejas",
  Chin: "Mentón",
  Neck: "Cuello",
  Shoulders: "Hombros",
  Height: "Altura",
  "Body build": "Constitución",
  Top: "Parte superior",
  "Top colour": "Color de la prenda",
  Bottoms: "Pantalones",
  Shoes: "Calzado",
  Bag: "Bolso",
  Accessory: "Accesorio",
  "Style your story.": "Tu historia, tu estilo.",
  "The hair studio": "Tu peluquería",
  Streetwear: "Urbano",
  "Night out": "Salir de noche",
  "Casual day": "Día tranquilo",
  "Beach plan": "Plan de playa",
  "Unsaved changes": "Cambios sin guardar",
  "Your saved look is ready.": "Tu estilo guardado está listo.",
  "Cannot export a screenshot on this browser.":
    "Este navegador no permite exportar la imagen.",
  "Restored your saved 3D look.": "Se ha recuperado tu estilo 3D guardado.",
  "Saving your avatar...": "Guardando tu avatar...",
  "Saved to your AkiPasa account.": "Guardado en tu cuenta de AkiPasa.",
  "Previous saved look unchanged.": "Tu estilo guardado no ha cambiado.",
  "3D could not render on this device.":
    "No se ha podido mostrar el personaje 3D en este dispositivo.",
  "Saved character loaded.": "Se ha cargado tu personaje guardado.",
  "Save before leaving this page. Unsaved edits are discarded when you return.":
    "Guarda antes de salir de esta página. Los cambios sin guardar se descartan al volver.",
  "Free starter character ready. Customise and save!":
    "Tu personaje inicial gratis está listo. ¡Personalízalo y guárdalo!",
  "3D runtime not loaded. Refresh to retry.":
    "No se ha cargado el motor 3D. Actualiza para volver a intentarlo.",
  "Cannot load saved avatar.": "No se puede cargar tu avatar guardado.",
  "Could not load the character studio.":
    "No se ha podido cargar el estudio de personajes.",
  "3D model failed to load.": "No se ha podido cargar el modelo 3D.",
  "The 3D model could not load. Please retry.":
    "No se ha podido cargar el modelo 3D. Vuelve a intentarlo.",
  "3D preview paused. Waiting for graphics to recover. Your saved look is unchanged.":
    "Vista 3D en pausa. Esperando a que se recuperen los gráficos. Tu estilo guardado no ha cambiado.",
  Feminine: "Femenina",
  Masculine: "Masculina",
  Porcelain: "Porcelana",
  Light: "Claro",
  Warm: "Cálido",
  Olive: "Oliva",
  Brown: "Castaño",
  Deep: "Oscuro",
  Oval: "Ovalada",
  Round: "Redonda",
  Angular: "Angular",
  Buzz: "Rapado",
  Crop: "Corto",
  Quiff: "Tupé",
  Bob: "Media melena",
  Curls: "Rizos",
  Long: "Largo",
  Bun: "Moño",
  Black: "Negro",
  Espresso: "Café",
  Chestnut: "Castaño",
  Auburn: "Cobrizo",
  Blonde: "Rubio",
  Silver: "Plateado",
  Pink: "Rosa",
  Blue: "Azul",
  Soft: "Suave",
  Almond: "Almendrados",
  Wide: "Anchos",
  Hazel: "Avellana",
  Green: "Verde",
  Grey: "Gris",
  Bold: "Marcadas",
  Arched: "Arqueadas",
  Straight: "Recta",
  Button: "Redondeada",
  Smile: "Sonrisa",
  Neutral: "Neutra",
  Grin: "Sonrisa amplia",
  Small: "Pequeñas",
  Regular: "Media",
  Prominent: "Prominentes",
  Pointed: "Puntiagudo",
  Square: "Cuadrado",
  Slim: "Estrecha",
  Broad: "Ancha",
  Narrow: "Estrechos",
  Short: "Baja",
  Medium: "Media",
  Tall: "Alta",
  Tee: "Camiseta",
  Hoodie: "Sudadera",
  Jacket: "Chaqueta",
  Sweater: "Jersey",
  Orange: "Naranja",
  Ink: "Tinta",
  Cream: "Crema",
  Mint: "Menta",
  Purple: "Morado",
  Red: "Rojo",
  Cargo: "Cargo",
  Jeans: "Vaqueros",
  Tailored: "De vestir",
  Shorts: "Pantalón corto",
  Sneakers: "Zapatillas",
  Boots: "Botas",
  Trainers: "Deportivas",
  None: "Sin accesorio",
  Crossbody: "Bandolera",
  Backpack: "Mochila",
  Glasses: "Gafas",
  Earrings: "Pendientes",
  Cap: "Gorra",
  "Private 3D studio": "Estudio 3D privado",
  "AkiPals / Your digital self": "AkiPals / Tu versión digital",
  "Looking like": "Tu estilo,",
  "yourself.": "tu esencia.",
  "Your very own 3D character for AkiPasa. Rotate your look, customize your features and mix streetwear pieces.":
    "Tu propio personaje 3D para AkiPasa. Gíralo, personaliza tus rasgos y combina ropa urbana.",
  "Real 3D preview": "Vista previa 3D",
  "One of one. Yours.": "Único. Como tú.",
  "Drag to rotate, pinch to zoom": "Arrastra para girar, pellizca para acercar",
  "Make it yours.": "Dale tu toque.",
  "Edit your real 3D character, then save your outfit and look to your account.":
    "Edita tu personaje 3D y guarda tu estilo y tu ropa en tu cuenta.",
  "Save my look": "Guardar mi estilo",
  "Restore saved look": "Recuperar estilo guardado",
  "Export a 3D preview image": "Exportar una imagen 3D",
  "Loading your 3D character…": "Cargando tu personaje 3D…",
  "Personal wardrobe": "Tu armario",
  "Free starter clothes now. Earned city drops and optional individually priced branded collections later. No paid randomness.":
    "Ropa básica gratis desde el principio. Más adelante, recuerdos de ciudades y colecciones opcionales con precios individuales. Sin recompensas aleatorias de pago.",
  "Places become memories": "Lugares que se vuelven recuerdos",
  "Future verified check-ins can unlock profile keepsakes and cosmetics, without combat stats or RPG mechanics.":
    "En el futuro, las visitas verificadas podrán desbloquear recuerdos y estilos para tu perfil, sin estadísticas de combate ni mecánicas de RPG.",
  "Where's Poppin'?": "¿Dónde está el ambiente?",
  "Aggregate venue activity and separate optional social presence are future features. No location-sharing in this preview.":
    "La actividad agregada de los locales y la presencia social opcional llegarán más adelante. Esta prueba no comparte tu ubicación.",
  "Private AkiPals 3D studio · CC0 character bases · No payments · No location sharing":
    "Estudio 3D privado de AkiPals · Modelos base CC0 · Sin pagos · Sin compartir ubicación",
  "Your avatar preview": "Vista previa de tu avatar",
  "Rotatable 3D avatar": "Avatar 3D giratorio",
  "Avatar customization": "Personalización del avatar",
  "Avatar editor controls": "Controles del editor de avatar",
  "Return to AkiPasa": "Volver a AkiPasa",
  "AkiPals | Your 3D character creator":
    "AkiPals | Tu creador de personajes 3D",
};
const STYLE = String.raw`
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#080c17;color:#f7f3ef}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:radial-gradient(circle at 25% 15%,#38283c,transparent 40%),radial-gradient(circle at 80% 55%,#1c3541,transparent 50%),#080c17}
button,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid #ffb080;outline-offset:3px}
a{color:inherit}header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px clamp(17px,5vw,55px);border-bottom:1px solid #ffffff25}
.brand{text-decoration:none;font-weight:900;font-size:22px;letter-spacing:-.045em}.brand em{font-style:normal;color:#ff9d71}
.pill{border:1px solid #ffffff34;padding:8px 12px;border-radius:30px;font-size:12px;color:#cecbd4}
header a.pill{display:inline-flex;align-items:center;min-height:44px}
main{max-width:1370px;margin:0 auto;padding:35px clamp(17px,4vw,55px) 60px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.21em;text-transform:uppercase;color:#ff9d71}
h1{font-size:clamp(38px,6vw,76px);letter-spacing:-.07em;line-height:1.03;margin:12px 0 15px}h1 em{color:#ff9863;font-style:normal}
.lede{color:#c3c5d0;max-width:800px;line-height:1.65;font-size:16px}
.grid{display:grid;grid-template-columns:minmax(290px,1fr) minmax(320px,1.13fr);gap:21px;margin-top:30px}
.panel{background:linear-gradient(140deg,#ffffff15,#ffffff07);border:1px solid #ffffff2b;border-radius:27px;overflow:hidden;min-width:0}
.stage{display:flex;flex-direction:column;align-items:center;padding:25px;min-height:620px;background:radial-gradient(circle at 50% 45%,#ff9e6737,transparent 52%),linear-gradient(150deg,#33283d,#171d2b 72%)}
.stage h2{align-self:flex-start;text-transform:uppercase;letter-spacing:.15em;font-size:12px;color:#f3c5a7;margin:0}
#portrait{width:min(100%,460px);margin:auto;filter:drop-shadow(0 19px 25px #02060a5e)}#portrait svg{display:block;width:100%;height:auto}
.stage-caption{text-align:center;font-weight:800;font-size:21px}.stage-caption small{display:block;font-weight:400;font-size:12px;max-width:360px;line-height:1.5;color:#b9bdc9;margin-top:8px}
.editor{padding:26px}.editor h2{font-size:26px;letter-spacing:-.04em;margin:0 0 8px}.editor>p{color:#b9becb;font-size:13px;line-height:1.6}
.group{padding-top:15px}.group h3{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#ffbc97}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:flex;flex-direction:column;gap:6px;color:#d0cbd3;font-size:12px;font-weight:600}
select{width:100%;background:#131b2a;color:#f8f2ed;border:1px solid #ffffff30;border-radius:12px;padding:12px 10px;min-height:46px}
.actions{display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid #ffffff2a;padding-top:21px;margin-top:24px}
button{padding:12px 17px;min-height:45px;border-radius:12px;background:#ffffff15;color:#f7f3ef;font-weight:800;border:1px solid #ffffff40}
button.primary{background:#ff854a;color:#241f28;border-color:#ff854a}button:disabled{opacity:1;cursor:default;background:#343743;color:#cbd0dc;border-color:#697180;box-shadow:none}.actions button.primary:disabled{background:#68432f;color:#ffe6d6;border-color:#a17457;box-shadow:none}
#status{flex-basis:100%;font-size:12px;color:#c2c7d1;min-height:18px}
.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:18px}
.note{background:#ffffff0a;border:1px solid #ffffff25;border-radius:17px;padding:19px}.note strong{font-size:14px}.note p{font-size:12px;line-height:1.6;color:#b5bdc9}
footer{text-align:center;font-size:12px;color:#979eae;padding:18px}
@media(max-width:860px){.grid{grid-template-columns:1fr}.stage{min-height:420px}#portrait{width:min(100%,360px)}.notes{grid-template-columns:1fr}}
@media(max-width:480px){.pill{font-size:10px}main{padding:28px 14px}.editor{padding:20px 16px}.stage{padding:19px}.panel{border-radius:21px}select{padding:9px 6px;font-size:13px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important;animation:none!important}}

/* The real WebGL stage replaces the previous illustrated SVG preview. */
.grid{grid-template-columns:minmax(340px,1.2fr) minmax(340px,.8fr);gap:18px}
.stage{position:relative;padding:0;min-height:630px;justify-content:flex-start;background:radial-gradient(ellipse at 50% 49%,#60463e70 0,transparent 64%),linear-gradient(140deg,#292636,#111923)}
.stage h2{position:absolute;top:22px;left:22px;z-index:2;border:1px solid #ff945e65;border-radius:22px;background:#11172295;padding:9px 12px;backdrop-filter:blur(8px)}
#avatar-stage{position:absolute;inset:0;height:100%;width:100%;touch-action:none;min-height:630px}
#avatar-stage canvas{display:block}
.stage-caption{position:absolute;z-index:3;left:18px;right:18px;bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}
.stage-caption small{font-size:11px;max-width:230px}.stage-caption .rotate{color:#fff;cursor:pointer;border:1px solid #ffffff60;border-radius:100px;background:#111723a8;padding:9px 14px}
.stage-caption strong{font-size:15px;line-height:1.1}
#stage-error{position:absolute;z-index:4;inset:0;background:#141927eb;display:grid;place-items:center;padding:24px;text-align:center;font-size:15px;color:#f3d2ba}
#stage-error[hidden]{display:none}
.editor{display:flex;flex-direction:column;min-height:630px;background:linear-gradient(155deg,#282735ee,#141c2bee)}
.editor >p{margin-top:4px}
.tabstrip{display:flex;gap:5px;overflow-x:auto;margin:13px 0 12px;padding-bottom:12px;border-bottom:1px solid #ffffff1c}
.tab{white-space:nowrap;padding:10px 10px;min-height:44px;font-size:12px;background:#ffffff0b;border:1px solid #ffffff2c;border-radius:12px}
.tab[aria-selected="true"]{background:#ff854a28;color:#ffc3a2;border-color:#ff955e;box-shadow:inset 0 -2px #ff854a}
#fields{flex:1}
.group h3{margin:3px 0 15px;font-size:14px;color:#ffc19e}
.color-group{grid-column:1/-1;border-top:1px solid #ffffff23;padding-top:12px}
.color-group strong{display:block;font-size:12px;margin-bottom:11px}
.swatches{display:flex;gap:9px;flex-wrap:wrap}
.swatch{width:44px;height:44px;min-height:44px;padding:0;border-radius:100%;background:var(--color);border:2px solid #ffffff48}
.swatch[aria-pressed="true"]{box-shadow:0 0 0 3px #ff854a57;border:3px solid #ff9659}
.presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0 0 16px}
.presets button{min-height:58px;border-radius:12px;padding:9px 12px;text-align:left;background:linear-gradient(135deg,#3f3844,#1e2634);font-size:12px}
.presets button[aria-pressed="true"]{border-color:#ff955e;background:linear-gradient(135deg,#5a332e,#202232)}
.actions{margin-top:auto}.actions button.primary{flex:1;background:linear-gradient(120deg,#ff914c,#ff7148);font-size:15px;box-shadow:0 7px 23px #f7754040}
.actions #download{width:100%;background:none;border:0;font-size:12px;min-height:44px;color:#cbd0dc;text-align:left;padding:0}
@media(max-width:860px){.grid{grid-template-columns:1fr}.stage,#avatar-stage{min-height:495px;height:495px}.editor{min-height:400px}}
@media(max-width:480px){.stage{border-radius:23px 23px 0 0}.stage,#avatar-stage{height:456px;min-height:456px}.stage h2{font-size:10px}.editor{border-radius:0 0 23px 23px;padding:22px 16px}.tab{font-size:11px;padding:10px 8px}.stage-caption strong{font-size:13px}.stage-caption small{font-size:10px}}
`;
const CLIENT = String.raw`
(()=>{"use strict";
const options=window.AKI_AVATAR_OPTIONS;
const t = text => window.AKI_AVATAR_TEXT[text] || text;
const tabs={
Character:[["model","Character model"],["height","Height"]],
Hair:[["hair","Hairstyle"],["hairColor","Hair colour"]],
Face:[["bodyStyle","Body frame"],["skin","Skin tone"],["face","Face shape"],["eyes","Eye shape"],["eyeColor","Eye colour"],["brows","Eyebrows"],["nose","Nose"],["mouth","Mouth"],["ears","Ears"],["chin","Chin"]],
Body:[["neck","Neck"],["shoulders","Shoulders"],["height","Height"],["build","Body build"]],
Outfit:[["top","Top"],["topColor","Top colour"],["bottom","Bottoms"],["shoes","Shoes"],["bag","Bag"]],
Extras:[["accessory","Accessory"]]
};
const presets={
street:{top:"hoodie",topColor:"orange",bottom:"cargo",shoes:"sneakers",bag:"crossbody"},
night:{top:"jacket",topColor:"ink",bottom:"tailored",shoes:"boots",bag:"none",accessory:"earrings"},
casual:{top:"sweater",topColor:"mint",bottom:"jeans",shoes:"trainers",bag:"none"},
beach:{top:"tee",topColor:"cream",bottom:"shorts",shoes:"sneakers",bag:"crossbody",accessory:"glasses"}
};
const colorSets={
skin:{porcelain:"#f2d6c7",light:"#e8c1a8",warm:"#d6a181",olive:"#b78b69",brown:"#946547",deep:"#664231"},
hairColor:{black:"#17191e",espresso:"#352523",chestnut:"#694332",auburn:"#a65f43",blonde:"#c99a59",silver:"#a9afb7",pink:"#b77892",blue:"#4d6ca3"},
eyeColor:{brown:"#573b31",hazel:"#8b714a",green:"#4e7462",blue:"#5689bb",grey:"#828a98"},
topColor:{orange:"#ff834b",ink:"#2a2e3a",cream:"#ede2d5",mint:"#78bcae",purple:"#836ca8",red:"#bb5160"}
};
const fields=document.querySelector("#fields"),area=document.querySelector("#avatar-stage"),status=document.querySelector("#status");
const save=document.querySelector("#save"),reset=document.querySelector("#reset"),failure=document.querySelector("#stage-error");
let current=null,saved=null,hasSaved=false,saving=false,rendering=true,tab="Character",stage=null;
const pretty=s=>s.charAt(0).toUpperCase()+s.slice(1).replaceAll("-"," ");
const modelNames={"classic-v2":"Classic saved look","rain-v3":"Rain","snow-v4":"Snow"};
const isProfessional=()=>current?.model==="rain-v3"||current?.model==="snow-v4";
function message(s){status.textContent=t(s)}
function changed(){return JSON.stringify(current)!==JSON.stringify(saved)}
function dirty(){return !hasSaved||changed()}
function buttons(){save.disabled=!current||!dirty()||saving||rendering;reset.disabled=!current||!changed()||saving;document.querySelector("#download").disabled=rendering}
function draw(){
 if(isProfessional()&&tab!=="Character")tab="Character";
 const previous = document.activeElement;
 const focusName = previous?.tagName === "SELECT" ? previous.name : null;
 const focusField = previous?.dataset?.field;
 const focusValue = previous?.dataset?.value;
 fields.replaceChildren();
 const title=document.createElement("h3");title.textContent=t(tab==="Outfit"?"Style your story.":tab==="Hair"?"The hair studio":tab);
 const section=document.createElement("section");section.className="group";section.append(title);
 if(tab==="Outfit"){
  const box=document.createElement("div");box.className="presets";
  for(const [id,p] of Object.entries(presets)){
   const btn=document.createElement("button");btn.type="button";btn.dataset.preset=id;
   btn.textContent=t({street:"Streetwear",night:"Night out",casual:"Casual day",beach:"Beach plan"}[id]);
   btn.setAttribute("aria-pressed",String(Object.keys(p).every(k=>current[k]===p[k])));box.append(btn);
  }
  section.append(box);
 }
 const grid=document.createElement("div");grid.className="fields";
 for(const [key,text] of tabs[tab]){
  if(colorSets[key]){
   const wrap=document.createElement("div");wrap.className="color-group";
   const heading=document.createElement("strong");heading.textContent=t(text);wrap.append(heading);
   const line=document.createElement("div");line.className="swatches";line.setAttribute("role","group");line.setAttribute("aria-label",t(text));
   for(const choice of options[key]){
    const btn=document.createElement("button");btn.type="button";btn.className="swatch";
    btn.dataset.field=key;btn.dataset.value=choice;btn.style.setProperty("--color",colorSets[key][choice]);
    btn.setAttribute("aria-label",t(text)+" "+t(pretty(choice)));btn.setAttribute("aria-pressed",String(current[key]===choice));
    line.append(btn);
   }wrap.append(line);grid.append(wrap);
  }else{
   const label=document.createElement("label");label.textContent=t(text);
   const select=document.createElement("select");select.name=key;select.setAttribute("aria-label",t(text));
   for(const choice of options[key]){
    const opt=document.createElement("option");opt.value=choice;opt.textContent=t(key==="model"?modelNames[choice]:pretty(choice));select.append(opt);
   }select.value=current[key];label.append(select);grid.append(label);
  }
 }
 section.append(grid);
 if(tab==="Character"&&isProfessional()){
  const note=document.createElement("p");note.textContent=t("Rain and Snow include their original hairstyle and outfit. You can choose a character and adjust its height.");section.append(note);
  const pose=document.createElement("p");pose.textContent=t("These character previews use a standing pose.");section.append(pose);
  const preserved=document.createElement("p");preserved.textContent=t("Your classic styling choices stay available when you switch back to Classic saved look.");section.append(preserved);
 }
 fields.append(section);
 document.querySelectorAll("[data-tab]").forEach(x=>{
  x.hidden=isProfessional()&&x.dataset.tab!=="Character";
  x.setAttribute("aria-selected",String(x.dataset.tab===tab));
  x.tabIndex=x.dataset.tab===tab?0:-1;
  x.id="tab-"+x.dataset.tab;x.setAttribute("aria-controls","fields");
 });
 fields.setAttribute("role","tabpanel");fields.setAttribute("aria-labelledby","tab-"+tab);
 const replacement=focusName?fields.querySelector('select[name="'+focusName+'"]'):focusField?Array.from(fields.querySelectorAll("[data-field]")).find(x=>x.dataset.field===focusField&&x.dataset.value===focusValue):null;
 replacement?.focus({preventScroll:true});
}
function change(patch){
 current={...current,...patch};draw();buttons();
 if(stage){void stage.setAppearance(current);message(dirty()?"Unsaved changes":"Your saved look is ready.");}
}
document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{if(!current)return;tab=btn.dataset.tab;draw();fields.focus({preventScroll:true})}));
document.querySelector(".tabstrip").addEventListener("keydown",event=>{
 if(!current||!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
 event.preventDefault();
 const buttons=Array.from(document.querySelectorAll("[data-tab]")).filter(button=>!button.hidden);
 const index=buttons.findIndex(button=>button.dataset.tab===tab);
 const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:(index+(event.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;
 tab=buttons[next].dataset.tab;draw();buttons[next].focus({preventScroll:true});
});
fields.addEventListener("change",event=>{
 const e=event.target;if(current&&e.tagName==="SELECT"&&options[e.name]?.includes(e.value))change({[e.name]:e.value});
});
fields.addEventListener("click",event=>{
 if(!current)return;const btn=event.target.closest("button");if(!btn)return;
 if(btn.dataset.field&&options[btn.dataset.field]?.includes(btn.dataset.value))change({[btn.dataset.field]:btn.dataset.value});
 else if(btn.dataset.preset)change(presets[btn.dataset.preset]);
});
document.querySelector("#rotate").addEventListener("click",()=>stage?.rotate(Math.PI/3));
document.querySelector("#download").addEventListener("click",()=>{
 if(!stage)return;try{
  const a=document.createElement("a");a.href=stage.screenshot();a.download="akipals-3d-preview.png";a.click();
 }catch{message("Cannot export a screenshot on this browser.")}
});
reset.addEventListener("click",()=>{if(!saved)return;current={...saved};draw();buttons();void stage?.setAppearance(current);message("Restored your saved 3D look.")});
save.addEventListener("click",async()=>{
 if(!current||saving||rendering||!dirty())return;
 saving=true;buttons();message("Saving your avatar...");
 try{
  const copy={...current};
  const response=await fetch("/pals/identity",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:copy,save:true})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"Save failed");
  saved={...result.appearance};hasSaved=true;message("Saved to your AkiPasa account.");
 }catch(err){message(err.message||"Previous saved look unchanged.")}
 finally{saving=false;buttons()}
});
function showError(msg){rendering=true;area.dataset.ready="error";buttons();failure.hidden=false;failure.textContent=t(msg);message("3D could not render on this device.")}
area.addEventListener("akipals:loading",()=>{rendering=true;area.dataset.ready="loading";buttons()});
area.addEventListener("akipals:rendered",()=>{rendering=false;buttons();failure.hidden=true;area.dataset.ready="true"});
area.addEventListener("akipals:error",event=>showError(event.detail?.message||"3D model failed to load."));
(async()=>{
 try{
  if(!window.AkiPals3D)throw new Error("3D runtime not loaded. Refresh to retry.");
  const response=await fetch("/pals/identity",{credentials:"same-origin",cache:"no-store"});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Cannot load saved avatar.");
  current={model:"classic-v2",...data.appearance};saved={...current};hasSaved=Boolean(data.saved);tab=current.model==="classic-v2"?"Hair":"Character";
  stage=window.AkiPals3D.mount(area);draw();buttons();void stage.setAppearance(current);
  message(data.saved?"Saved character loaded.":"Free starter character ready. Customise and save!");
 }catch(error){showError(error.message||"Could not load the character studio.")}
})();
window.addEventListener("pagehide",()=>{rendering=true;buttons();stage?.dispose()},{once:true});
// A BFCache-restored document contains a disposed canvas and may belong to an
// earlier account session. Re-enter through the server's private access gate;
// restore only the saved identity, never a cached unsaved local draft.
window.addEventListener("pageshow",event=>{if(event.persisted)window.location.reload()});
})();
`;
export function identityPreviewHtml(
  nonce: string,
  locale: "en" | "es" = "en",
): string {
  const t = (text: string) => (locale === "es" ? SPANISH[text] || text : text);
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#080c17"><title>${t("AkiPals | Wardrobe")}</title><link rel="icon" href="/icon.svg"><style nonce="${nonce}">${STYLE}</style></head>
<body><header><a class="brand" href="/${locale}" aria-label="${t("Return to AkiPasa")}">Aki<em>Pals</em></a><a class="pill" href="/pals/world" style="text-decoration:none" aria-label="${t("Enter the private AkiPals World prototype")}">◉ ${t("Enter AkiWorld")} ↗</a></header>
<main><p class="eyebrow">${t("AkiPals / Wardrobe")}</p><h1>${t("Looking like")} <em>${t("yourself.")}</em></h1>
<p class="lede">${t("Choose your character and save the look you want to take into AkiWorld.")}</p>
<div class="grid"><section class="panel stage" aria-label="${t("Your avatar preview")}"><h2>✦ ${t("Real 3D preview")}</h2><div id="avatar-stage" aria-label="${t("Rotatable 3D avatar")}"></div><div id="stage-error" hidden></div><div class="stage-caption"><div><strong>${t("One of one. Yours.")}</strong><small>${t("Drag to rotate, pinch to zoom")}</small></div><button class="rotate" id="rotate" type="button">⤾ 360°</button></div></section>
<section class="panel editor"><h2>${t("Your Wardrobe.")}</h2><p>${t("Make this 3D character yours. Your saved appearance is reused on the AkiWorld map.")}</p><p>${t("Save before leaving this page. Unsaved edits are discarded when you return.")}</p><div class="tabstrip" role="tablist" aria-label="${t("Avatar customization")}"><button class="tab" type="button" data-tab="Character" role="tab" aria-selected="true">${t("Character")}</button><button class="tab" type="button" data-tab="Face" role="tab">${t("Face")}</button><button class="tab" type="button" data-tab="Hair" role="tab">${t("Hair")}</button><button class="tab" type="button" data-tab="Body" role="tab">${t("Body")}</button><button class="tab" type="button" data-tab="Outfit" role="tab">${t("Outfit")}</button><button class="tab" type="button" data-tab="Extras" role="tab">${t("Extras")}</button></div><div id="fields" tabindex="-1" aria-label="${t("Avatar editor controls")}"></div><div class="actions"><button id="save" type="button" class="primary" disabled>${t("Save my look")}</button><button id="reset" type="button" disabled>${t("Restore saved look")}</button><button id="download" type="button">↓ ${t("Export a 3D preview image")}</button><span id="status" role="status" aria-live="polite">${t("Loading your 3D character\u2026")}</span></div></section></div>
<div class="notes"><div class="note"><strong>✧ ${t("Personal wardrobe")}</strong><p>${t("Free starter clothes now. Earned city drops and optional individually priced branded collections later. No paid randomness.")}</p></div><div class="note"><strong>◎ ${t("Your look goes exploring")}</strong><p>${t("Future verified check-ins can unlock profile keepsakes and cosmetics, without combat stats or RPG mechanics.")}</p></div><div class="note"><strong>◉ ${t("Where's Poppin'?")}</strong><p>${t("Aggregate venue activity and separate optional social presence are future features. No location-sharing in this preview.")}</p></div></div>
</main><footer>${t("Private AkiPals Wardrobe · Free starter characters · No payments · No location sharing from this screen")} · <a href="/pals/models/professional/ATTRIBUTION.txt" target="_blank" rel="noopener">${t("Character credits")}</a></footer>
<script nonce="${nonce}" src="/pals/runtime/creator.min.js?v=20261031-professional-1"></script><script nonce="${nonce}">window.AKI_AVATAR_TEXT=${JSON.stringify(locale === "es" ? SPANISH : {})};window.AKI_AVATAR_OPTIONS=${JSON.stringify(APPEARANCE_OPTIONS)};${CLIENT}</script></body></html>`;
}
