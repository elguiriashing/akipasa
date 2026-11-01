import { APPEARANCE_OPTIONS } from "@/lib/pals/avatar-v2";
import {
  PALS_RUNTIME_VERSION,
  STARTER_COLORS,
  STARTER_HAIR_TINTS,
} from "@/lib/pals/starter-catalogue";
const SPANISH: Record<string, string> = {
  "Your look. Your next adventure.": "Tu estilo. Tu próxima aventura.",
  "Private playtest": "Prueba privada",
  "Free starter wardrobe": "Armario inicial gratis",
  "Outfit style": "Estilo de ropa",
  Clothes: "Ropa",
  Colour: "Color",
  World: "Mundo",
  Profile: "Perfil",
  "Your style kit": "Tu colección de estilos",
  "Everything here is free": "Todo aquí es gratis",
  "Aki Crew": "Aki Crew",
  Varsity: "Universitario",
  Explorer: "Explorador",
  "Signature colour and badge": "Color y emblema Aki",
  "Contrast collar and hem": "Cuello y bajos a contraste",
  "Layered vest and centre seam": "Chaleco y costura central",
  Original: "Original",
  Swept: "Con flequillo",
  Cropped: "Corto",
  "Outfit palette": "Paleta de ropa",
  Ember: "Ámbar",
  Midnight: "Medianoche",
  Coast: "Costa",
  Orchid: "Orquídea",
  Sand: "Arena",
  Copper: "Cobre",
  "Retry 3D": "Reintentar 3D",
  "Loading your look…": "Cargando tu estilo…",
  "Your saved look is safe. Retry or choose another character.":
    "Tu estilo guardado está a salvo. Reintenta o elige otro personaje.",
  "Rotate character": "Girar personaje",
  "Save look": "Guardar estilo",
  "Undo changes": "Deshacer cambios",
  "Save before leaving. Your changes are private until saved.":
    "Guarda antes de salir. Los cambios son privados hasta que los guardes.",
  "Choose an authored character": "Elige un personaje 3D",
  "Three starter outfits": "Tres estilos iniciales",
  "Made for both Rain and Snow": "Para Rain y Snow",
  "Take your look into World": "Lleva tu estilo al Mundo",
  "Your saved character follows you": "Tu personaje guardado te acompaña",
  "Standing-pose playtest": "Prueba con pose de pie",
  "Body shaping and animation are not included yet":
    "Los ajustes corporales y la animación aún no están incluidos",
  "Your older save is safe. Save this updated look to use it next time.":
    "Tu estilo anterior está a salvo. Guarda este nuevo estilo para la próxima vez.",
  "Choose your look": "Elige tu estilo",

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
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,sans-serif;background:#080b10;color:#f6f4f0;--accent:#ff8b45;--muted:#b6bbc6}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 15% 15%,#39202c70,transparent 55%),#080b10;min-height:100svh;padding-bottom:calc(82px + env(safe-area-inset-bottom))}
button,select{font:inherit}button,a{-webkit-tap-highlight-color:transparent}button{cursor:pointer}a{color:inherit;text-decoration:none}button:focus-visible,a:focus-visible,select:focus-visible{outline:3px solid #ffc292;outline-offset:4px}
button{border:1px solid #ffffff26;color:inherit;background:#1b202a;min-height:44px;border-radius:14px}button:disabled{cursor:default;color:#aeb3c0;background:#252934;border-color:#424956;box-shadow:none}
header{max-width:1200px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px}.brand{display:flex;align-items:center;gap:9px;font-size:23px;font-weight:850;letter-spacing:-.8px}.brand img{width:29px;height:34px}.pill{display:flex;align-items:center;gap:7px;border:1px solid #ffffff25;border-radius:30px;padding:9px 12px;font-size:11px;color:var(--muted)}.pill:before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}
main{max-width:1160px;margin:auto;padding:6px 24px 22px}h1{font-size:clamp(35px,5vw,58px);letter-spacing:-2.8px;line-height:1;margin:8px 0}.lede{font-size:14px;color:#d2d4dc;margin:10px 0 20px}.grid{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:stretch}
.stage{position:relative;min-width:0;min-height:560px;border:1px solid #ffffff20;border-radius:26px;overflow:hidden;background:radial-gradient(ellipse at 22% 75%,#e777323d,transparent 45%),radial-gradient(ellipse at 70% 30%,#5250a53d,transparent 55%),linear-gradient(170deg,#191723,#10171e 85%)}
.stage:before{content:"";position:absolute;inset:55% 0 0;background:repeating-linear-gradient(100deg,transparent 0 62px,#ffffff04 63px 64px);transform:perspective(300px) rotateX(35deg);transform-origin:bottom;pointer-events:none}.stage h2{position:absolute;top:18px;left:18px;z-index:2;margin:0;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:#ffd0ac;background:#14131bc9;border:1px solid #f2a5653b;padding:9px 11px;border-radius:30px}
#avatar-stage{position:absolute;left:-3%;right:64px;top:0;bottom:0;touch-action:none}#avatar-stage canvas{display:block;width:100%;height:100%}.stage-caption{position:absolute;left:16px;bottom:17px;right:96px;display:flex;align-items:center;justify-content:space-between;gap:8px;z-index:2}.stage-caption small{font-size:10px;color:#bdc4d3;line-height:1.5;max-width:140px}.rotate{font-size:20px;width:44px;background:#131722c9;border-radius:50%}
.tabstrip{position:absolute;right:12px;top:70px;display:flex;flex-direction:column;padding:5px;gap:5px;z-index:3;border-radius:20px;border:1px solid #ffffff22;background:#0d121ceb;box-shadow:0 12px 32px #0005}.tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid transparent;border-radius:14px;background:transparent;width:70px;height:70px;font-size:10px;color:#c6cad4}.tab svg{width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.tab[aria-selected=true]{background:#ff8b4521;border-color:#ff9a605c;color:#ffbd8e}
#stage-error{position:absolute;inset:58px 100px 65px 12px;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:15px;background:#10151deb;border-radius:20px}#stage-error[hidden],#stage-retry[hidden]{display:none}#stage-error p{font-size:13px;line-height:1.6;color:#d6d8e0;margin:0}#stage-retry{padding:9px 15px;background:#ff8b45;color:#24180e;font-weight:750}.loader{width:27px;height:27px;border:2px solid #ff9d7133;border-top-color:#ff9d71;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.editor{min-width:0;padding:23px;border:1px solid #ffffff20;border-radius:24px;background:linear-gradient(135deg,#20202be8,#10161de8);display:flex;flex-direction:column}.editor-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.editor h2{font-size:22px;letter-spacing:-.7px;margin:0}.free{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#ffb888}.editor-intro{font-size:12px;line-height:1.6;color:var(--muted);margin:9px 0 18px}.group h3{font-size:13px;font-weight:650;margin:0 0 14px;color:#e7e7ed}.fields{display:grid;gap:12px;min-width:0}.choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.choice{position:relative;min-width:0;min-height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px 6px;background:#ffffff05;font-size:12px}.choice small{color:#aeb6c5;line-height:1.4;font-size:10px;text-align:center}.choice[aria-pressed=true]{background:#ff8b4517;border-color:#ff9d71;box-shadow:inset 0 0 0 1px #ff9d7130}.choice[aria-pressed=true]:after{content:"✓";position:absolute;right:6px;top:4px;color:#ffbd8e;font-size:11px}.choice-icon{font-size:25px;line-height:1;color:#ffb581}.choice svg{width:30px;height:30px;stroke:currentColor;fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.character-choices{grid-template-columns:1fr 1fr}.character-choices .choice{min-height:100px;font-size:16px;letter-spacing:-.4px}
.palette-group{margin-top:10px}.palette-group>strong{display:block;font-size:12px;color:#ced2dc;margin:10px 0}.palettes{display:flex;flex-wrap:wrap;gap:10px}.palette{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:#ffffff06;min-width:52px;min-height:74px;padding:9px 7px;border-radius:14px;font-size:10px;color:#c4cbd7}.palette-colours{display:flex}.palette-colours i{display:block;width:13px;height:25px;background:var(--color)}.palette-colours i:first-child{border-radius:10px 0 0 10px}.palette-colours i:last-child{border-radius:0 10px 10px 0}.palette[aria-pressed=true],.swatch[aria-pressed=true]{border-color:#ffb27d;box-shadow:0 0 0 2px #ff985739}.swatches{display:flex;flex-wrap:wrap;gap:10px}.swatch{width:44px;height:44px;border-radius:50%;padding:6px;background:transparent}.swatch i{display:block;background:var(--color);width:100%;height:100%;border-radius:50%;border:1px solid #ffffff3b}
label{display:flex;flex-direction:column;gap:8px;font-size:12px;color:#c9cfda;margin-top:10px}select{background:#111822;border:1px solid #ffffff30;color:#f6f5f3;padding:11px;border-radius:12px;min-height:44px;width:100%}.actions{margin-top:auto;padding-top:22px}.primary-row{display:flex;gap:9px}#save{flex:1;color:#22160f;background:linear-gradient(120deg,#ffac63,#ff7a39);border-color:#ff9f63;font-size:14px;font-weight:800;box-shadow:0 5px 20px #fc7b2920}#save:disabled{color:#e4c1aa;background:#5d3f2e;border-color:#8a624c;box-shadow:none}#reset{padding:9px 12px;font-size:11px}#status{display:block;min-height:36px;font-size:11px;line-height:1.5;color:#d0d5e0;margin-top:12px}.save-note{font-size:10px;color:#9fa9b9;line-height:1.5;margin:0}#download{margin-top:8px;min-height:44px;width:100%;border:0;background:transparent;font-size:11px;color:#c1c7d3;text-align:left;padding:0}
.kit{margin-top:22px}.kit h2{font-size:19px;margin:0 0 12px;letter-spacing:-.5px}.notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.note{border:1px solid #ffffff20;border-radius:18px;background:linear-gradient(140deg,#38251c60,#141921);padding:17px 13px;min-width:0}.note .note-icon{font-size:23px;color:#ff934c;display:block;margin-bottom:13px}.note strong{font-size:12px;line-height:1.4;display:block}.note p{font-size:11px;line-height:1.5;color:#aeb7c6;margin:7px 0 0}footer{text-align:center;font-size:10px;line-height:1.7;color:#9aa4b4;padding:10px 24px}footer a{text-decoration:underline}.dock{position:fixed;z-index:10;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 15px calc(8px + env(safe-area-inset-bottom));border-top:1px solid #ffffff24;background:#0b1119f5;backdrop-filter:blur(16px)}.dock a{min-width:72px;width:130px;min-height:51px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border-radius:14px;color:#b9c0ce;font-size:11px}.dock a[aria-current=page]{color:#ffb37c;background:#ff8b4518}.dock svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:760px){header{padding:14px 17px}.brand{font-size:21px}.pill{font-size:10px}main{padding:4px 14px 14px}h1{font-size:40px;letter-spacing:-2px}.lede{font-size:12px;margin-bottom:15px}.grid{grid-template-columns:1fr;gap:0}.stage{min-height:380px;height:48svh;max-height:500px;border-radius:23px 23px 0 0;border-bottom:0}.editor{padding:18px 16px;border-radius:0 0 23px 23px}.editor-intro{margin-bottom:14px}.editor h2{font-size:19px}.tabstrip{top:61px;right:10px}.tab{width:62px;height:62px}.tab svg{width:22px;height:22px}#avatar-stage{right:64px;left:-6%}.stage-caption{right:89px;bottom:12px}.stage h2{font-size:9px;left:13px;top:14px}#stage-error{right:90px}.actions{padding-top:17px}.choice{min-height:87px}.kit{margin-top:19px}.note{padding:14px 10px}.note strong{font-size:11px}.note p{font-size:10px}.notes{gap:8px}}
@media(max-width:360px){main{padding-left:10px;padding-right:10px}.stage{min-height:345px}.tab{width:55px;height:59px}.pill{font-size:9px;padding:8px}.choices{gap:6px}.choice{font-size:11px}#reset{font-size:10px;padding:8px}.editor{padding:16px 12px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
`;

const CLIENT = String.raw`
(()=>{"use strict";
const options=window.AKI_AVATAR_OPTIONS,t=text=>window.AKI_AVATAR_TEXT[text]||text;
const fields=document.querySelector("#fields"),area=document.querySelector("#avatar-stage"),status=document.querySelector("#status"),save=document.querySelector("#save"),reset=document.querySelector("#reset"),failure=document.querySelector("#stage-error"),retry=document.querySelector("#stage-retry"),errorText=document.querySelector("#stage-message"),spinner=document.querySelector(".loader");
const label={"rain-v3":"Rain","snow-v4":"Snow",crew:"Aki Crew",varsity:"Varsity",explorer:"Explorer",original:"Original",swept:"Swept",cropped:"Cropped",ember:"Ember",midnight:"Midnight",coast:"Coast",orchid:"Orchid",sand:"Sand",espresso:"Espresso",black:"Black",copper:"Copper",blonde:"Blonde",silver:"Silver",pink:"Pink",short:"Short",medium:"Medium",tall:"Tall"};
let current=null,saved=null,hasSaved=false,saving=false,rendering=true,tab="Outfit",stage=null,starting=false,disposed=false;
const authored=a=>({...a,model:!a.model||a.model==="classic-v2"?"rain-v3":a.model,starterOutfit:a.starterOutfit||"crew",starterHair:a.starterHair||"original",starterPalette:a.starterPalette||"ember",starterHairColor:a.starterHairColor||"espresso"});
function message(text){status.textContent=t(text)}
function changed(){return JSON.stringify(current)!==JSON.stringify(saved)}
function dirty(){return !hasSaved||changed()}
function buttons(){save.disabled=!current||!dirty()||saving||rendering;reset.disabled=!current||!changed()||saving;document.querySelector("#download").disabled=rendering||!stage}
function choiceGroup(key,title){
 const group=document.createElement("div");group.className="choices"+(key==="model"?" character-choices":"");group.setAttribute("role","group");group.setAttribute("aria-label",t(title));
 for(const value of options[key]){
  const button=document.createElement("button");button.type="button";button.className="choice";button.dataset.field=key;button.dataset.value=value;button.setAttribute("aria-label",t(label[value]));button.setAttribute("aria-pressed",String(current[key]===value));
  const icon=document.createElement("span");icon.className="choice-icon";icon.setAttribute("aria-hidden","true");icon.textContent=key==="model"?(value==="rain-v3"?"R":"S"):key==="starterHair"?({original:"≋",swept:"〰",cropped:"⌁"}[value]):({crew:"✦",varsity:"◈",explorer:"▤"}[value]);
  const name=document.createElement("strong");name.textContent=t(label[value]);button.append(icon,name);
  if(key==="starterOutfit"){const note=document.createElement("small");note.textContent=t({crew:"Signature colour and badge",varsity:"Contrast collar and hem",explorer:"Layered vest and centre seam"}[value]);button.append(note)}
  group.append(button);
 }return group;
}
function paletteGroup(){
 const group=document.createElement("div");group.className="palette-group";const heading=document.createElement("strong");heading.textContent=t("Outfit palette");group.append(heading);
 const line=document.createElement("div");line.className="palettes";line.setAttribute("role","group");line.setAttribute("aria-label",t("Outfit palette"));
 for(const value of options.starterPalette){const button=document.createElement("button");button.type="button";button.className="palette";button.dataset.field="starterPalette";button.dataset.value=value;button.setAttribute("aria-label",t(label[value]));button.setAttribute("aria-pressed",String(current.starterPalette===value));const chips=document.createElement("span");chips.className="palette-colours";chips.setAttribute("aria-hidden","true");for(const color of Object.values(window.AKI_STARTER_COLORS[value])){const chip=document.createElement("i");chip.style.setProperty("--color",color);chips.append(chip)}button.append(chips,document.createTextNode(t(label[value])));line.append(button)}group.append(line);return group;
}
function hairColours(){const group=document.createElement("div");group.className="palette-group";const heading=document.createElement("strong");heading.textContent=t("Hair colour");group.append(heading);const line=document.createElement("div");line.className="swatches";line.setAttribute("role","group");line.setAttribute("aria-label",t("Hair colour"));for(const value of options.starterHairColor){const button=document.createElement("button");button.type="button";button.className="swatch";button.dataset.field="starterHairColor";button.dataset.value=value;button.setAttribute("aria-label",t("Hair colour")+" "+t(label[value]));button.setAttribute("aria-pressed",String(current.starterHairColor===value));const chip=document.createElement("i");chip.style.setProperty("--color",window.AKI_STARTER_HAIR[value]);chip.setAttribute("aria-hidden","true");button.append(chip);line.append(button)}group.append(line);return group;}
function draw(){
 const previous=document.activeElement,focusField=previous?.dataset.field,focusValue=previous?.dataset.value,focusName=previous?.name;
 fields.replaceChildren();const section=document.createElement("section");section.className="group";const title=document.createElement("h3");title.textContent=t({Character:"Choose an authored character",Outfit:"Outfit style",Hair:"Hairstyle",Colour:"Outfit palette"}[tab]);section.append(title);const grid=document.createElement("div");grid.className="fields";
 if(tab==="Character"){grid.append(choiceGroup("model","Character model"));const wrap=document.createElement("label");wrap.textContent=t("Height");const select=document.createElement("select");select.name="height";select.setAttribute("aria-label",t("Height"));for(const value of options.height){const option=document.createElement("option");option.value=value;option.textContent=t(label[value]);select.append(option)}select.value=current.height;wrap.append(select);grid.append(wrap)}
 if(tab==="Outfit")grid.append(choiceGroup("starterOutfit","Outfit style"));
 if(tab==="Hair")grid.append(choiceGroup("starterHair","Hairstyle"),hairColours());
 if(tab==="Colour")grid.append(paletteGroup(),hairColours());
 section.append(grid);fields.append(section);
 document.querySelectorAll("[data-tab]").forEach(button=>{button.setAttribute("aria-selected",String(button.dataset.tab===tab));button.tabIndex=button.dataset.tab===tab?0:-1});fields.setAttribute("aria-labelledby","tab-"+tab);
 if(focusField)Array.from(fields.querySelectorAll("[data-field]")).find(button=>button.dataset.field===focusField&&button.dataset.value===focusValue)?.focus({preventScroll:true});else if(focusName)fields.querySelector('select[name="'+focusName+'"]')?.focus({preventScroll:true});
}
function change(patch){current={...current,...patch};draw();buttons();if(stage)void stage.setAppearance(current);message(dirty()?"Unsaved changes":"Your saved look is ready.")}
document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>{if(!current)return;tab=button.dataset.tab;draw()}));
document.querySelector(".tabstrip").addEventListener("keydown",event=>{if(!current||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(event.key))return;event.preventDefault();const tabs=Array.from(document.querySelectorAll("[data-tab]")),index=tabs.findIndex(button=>button.dataset.tab===tab),next=event.key==="Home"?0:event.key==="End"?tabs.length-1:(index+(["ArrowRight","ArrowDown"].includes(event.key)?1:-1)+tabs.length)%tabs.length;tab=tabs[next].dataset.tab;draw();tabs[next].focus({preventScroll:true})});
fields.addEventListener("click",event=>{const button=event.target.closest("button[data-field]");if(current&&button&&options[button.dataset.field]?.includes(button.dataset.value))change({[button.dataset.field]:button.dataset.value})});
fields.addEventListener("change",event=>{const input=event.target;if(current&&input.tagName==="SELECT"&&options[input.name]?.includes(input.value))change({[input.name]:input.value})});
document.querySelector("#rotate").addEventListener("click",()=>stage?.rotate(Math.PI/3));
document.querySelector("#download").addEventListener("click",()=>{if(!stage||rendering)return;try{const link=document.createElement("a");link.href=stage.screenshot();link.download="akipals-3d-preview.png";link.click()}catch{message("Cannot export a screenshot on this browser.")}});
reset.addEventListener("click",()=>{if(!saved)return;current={...saved};draw();buttons();void stage?.setAppearance(current);message("Restored your saved 3D look.")});
save.addEventListener("click",async()=>{if(!current||saving||rendering||!dirty())return;saving=true;buttons();message("Saving your avatar...");try{const copy={...current};const response=await fetch("/pals/identity",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:copy,save:true})});const result=await response.json();if(!response.ok)throw new Error("Previous saved look unchanged.");saved=authored(result.appearance);hasSaved=true;message("Saved to your AkiPasa account.")}catch{message("Previous saved look unchanged.")}finally{saving=false;buttons()}});
function showError(){rendering=true;area.dataset.ready="error";buttons();failure.hidden=false;spinner.hidden=true;retry.hidden=false;errorText.textContent=t("Your saved look is safe. Retry or choose another character.");message("The 3D model could not load. Please retry.")}
area.addEventListener("akipals:loading",()=>{rendering=true;area.dataset.ready="loading";buttons();failure.hidden=false;spinner.hidden=false;retry.hidden=true;errorText.textContent=t("Loading your look…")});
area.addEventListener("akipals:rendered",()=>{rendering=false;area.dataset.ready="true";failure.hidden=true;buttons()});
area.addEventListener("akipals:error",showError);
async function start(){if(starting||disposed)return;starting=true;try{if(!window.AkiPals3D)throw new Error("Runtime missing");const response=await fetch("/pals/identity",{credentials:"same-origin",cache:"no-store"});const data=await response.json();if(!response.ok||!data.appearance)throw new Error("Identity unavailable");if(disposed)return;current=authored(data.appearance);saved={...current};hasSaved=Boolean(data.saved)&&!data.needsUpgrade;stage=window.AkiPals3D.mount(area);draw();buttons();void stage.setAppearance(current);message(data.needsUpgrade?"Your older save is safe. Save this updated look to use it next time.":data.saved?"Saved character loaded.":"Free starter character ready. Customise and save!")}catch{showError()}finally{starting=false}}
retry.addEventListener("click",()=>{if(stage&&current)void stage.setAppearance(current);else if(!window.AkiPals3D)window.location.reload();else void start()});
void start();
window.addEventListener("pagehide",()=>{disposed=true;rendering=true;buttons();stage?.dispose()},{once:true});
window.addEventListener("pageshow",event=>{if(event.persisted)window.location.reload()});
})();
`;

const ICONS: Record<string, string> = {
  Character:
    '<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  Outfit: '<path d="m8 3-5 3 3 5 2-1v11h8V10l2 1 3-5-5-3a4 4 0 0 1-8 0Z"/>',
  Hair: '<path d="M5 18V9a7 7 0 0 1 14 0v9M5 9c6 0 8-4 8-5 0 4 3 5 6 5M8 12v2a4 4 0 0 0 8 0v-2"/>',
  Colour:
    '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4 2 2 0 0 1 1-4h2a3 3 0 0 0 3-3c0-4-4-7-9-7Z"/><circle cx="7" cy="10" r=".7"/><circle cx="10" cy="6" r=".7"/><circle cx="15" cy="7" r=".7"/>',
  World:
    '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};
const svg = (name: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
export function identityPreviewHtml(
  nonce: string,
  locale: "en" | "es" = "en",
): string {
  const t = (text: string) => (locale === "es" ? SPANISH[text] || text : text);
  const world = `/pals/world`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#080b10"><title>${t("AkiPals | Wardrobe")}</title><link rel="icon" href="/icon.svg"><style nonce="${nonce}">${STYLE}</style></head>
<body><header><a class="brand" href="/${locale}" aria-label="${t("Return to AkiPasa")}"><img src="/icon.svg" alt=""/>AkiPasa</a><span class="pill">${t("Private playtest")}</span></header>
<main><h1>AkiPals</h1><p class="lede">${t("Your look. Your next adventure.")}</p>
<div class="grid"><section class="stage" aria-label="${t("Your avatar preview")}"><h2>✦ ${t("Free starter wardrobe")}</h2><div id="avatar-stage" aria-label="${t("Rotatable 3D avatar")}"></div>
<div id="stage-error" role="status"><span class="loader" aria-hidden="true"></span><p id="stage-message">${t("Loading your look…")}</p><button id="stage-retry" type="button" hidden>${t("Retry 3D")}</button></div>
<div class="tabstrip" role="tablist" aria-orientation="vertical" aria-label="${t("Avatar customization")}">${["Character", "Outfit", "Hair", "Colour"].map((name) => `<button id="tab-${name}" class="tab" type="button" data-tab="${name}" role="tab" aria-controls="fields" aria-selected="${name === "Outfit"}" tabindex="${name === "Outfit" ? 0 : -1}">${svg(name)}<span>${t(name === "Outfit" ? "Clothes" : name)}</span></button>`).join("")}</div>
<div class="stage-caption"><small>${t("Drag to rotate, pinch to zoom")}</small><button class="rotate" id="rotate" type="button" aria-label="${t("Rotate character")}">⤾</button></div></section>
<section class="editor" aria-label="${t("Avatar editor controls")}"><div class="editor-title"><h2>${t("Choose your look")}</h2><span class="free">${t("Everything here is free")}</span></div><p class="editor-intro">${t("Make this 3D character yours. Your saved appearance is reused on the AkiWorld map.")}</p><div id="fields" role="tabpanel" tabindex="-1" aria-labelledby="tab-Outfit"></div>
<div class="actions"><div class="primary-row"><button id="save" type="button" class="primary" disabled>${t("Save look")}</button><button id="reset" type="button" disabled>${t("Undo changes")}</button></div><span id="status" role="status" aria-live="polite">${t("Loading your look…")}</span><p class="save-note">${t("Save before leaving. Your changes are private until saved.")}</p><button id="download" type="button" disabled>↓ ${t("Export a 3D preview image")}</button></div></section></div>
<section class="kit"><h2>${t("Your style kit")}</h2><div class="notes"><div class="note"><span class="note-icon" aria-hidden="true">✦</span><strong>${t("Three starter outfits")}</strong><p>${t("Made for both Rain and Snow")}</p></div><a class="note" href="${world}" aria-label="${t("Enter the private AkiPals World prototype")}"><span class="note-icon" aria-hidden="true">◎</span><strong>${t("Take your look into World")}</strong><p>${t("Your saved character follows you")}</p></a><div class="note"><span class="note-icon" aria-hidden="true">◇</span><strong>${t("Standing-pose playtest")}</strong><p>${t("Body shaping and animation are not included yet")}</p></div></div></section></main>
<footer>${t("Private AkiPals Wardrobe · Free starter characters · No payments · No location sharing from this screen")}<br><a href="/pals/models/professional/ATTRIBUTION.txt" target="_blank" rel="noopener">${t("Character credits")}</a></footer>
<nav class="dock" aria-label="AkiPals"><a href="${world}">${svg("World")}${t("World")}</a><a href="/pals?lang=${locale}" aria-current="page">${svg("Outfit")}${t("Your Wardrobe.").replace(".", "")}</a><a href="/${locale}/account">${svg("Character")}${t("Profile")}</a></nav>
<script nonce="${nonce}" src="/pals/runtime/creator.min.js?v=${PALS_RUNTIME_VERSION}"></script><script nonce="${nonce}">window.AKI_AVATAR_TEXT=${JSON.stringify(locale === "es" ? SPANISH : {})};window.AKI_AVATAR_OPTIONS=${JSON.stringify(APPEARANCE_OPTIONS)};window.AKI_STARTER_COLORS=${JSON.stringify(STARTER_COLORS)};window.AKI_STARTER_HAIR=${JSON.stringify(STARTER_HAIR_TINTS)};${CLIENT}</script></body></html>`;
}
