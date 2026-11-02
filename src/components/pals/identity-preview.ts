import { PALS_RENDERER_VERSION } from "@/lib/pals/renderer-version";
import {
  APPEARANCE_OPTIONS,
  APPEARANCE_PALETTES,
  AUTHORED_CHARACTER_PRESETS,
} from "@/lib/pals/avatar-v2";
import { authoredWardrobeCatalogue } from "@/lib/pals/catalogue";
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
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#101014;color:#fff5ec;font-synthesis:none}*{box-sizing:border-box}body{margin:0}button,a{touch-action:manipulation}button{font:inherit;cursor:pointer;color:inherit}button:disabled{opacity:.5;cursor:default}button:focus-visible,a:focus-visible{outline:3px solid #ffb56f;outline-offset:4px}a{color:inherit}header{height:64px;padding:0 clamp(16px,4vw,48px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff20}.brand{font-size:22px;font-weight:850;text-decoration:none}.brand em{font-style:normal;color:#ff8b3f}.world-link{font-size:13px;text-decoration:none;padding:12px;border:1px solid #ffffff30;border-radius:99px}main{max-width:1500px;margin:auto;padding:20px clamp(12px,3vw,40px)}h1{font-size:23px;margin:0 0 16px;letter-spacing:-.04em}.grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(290px,1fr);gap:20px;align-items:start}.stage{position:sticky;top:12px;height:calc(100svh - 132px);min-height:570px;max-height:900px;border:1px solid #ffffff24;border-radius:28px;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#8b614742,transparent 68%),linear-gradient(150deg,#302626,#151821)}#avatar-stage{position:absolute;inset:0;touch-action:none}#avatar-stage canvas{display:block;width:100%;height:100%}.stage-tools{position:absolute;bottom:16px;right:12px;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}.stage-tools button{pointer-events:auto;width:46px;height:46px;border:1px solid #ffffff4a;background:#161517cf;border-radius:50%;font-size:20px;backdrop-filter:blur(8px)}#stage-error{position:absolute;inset:0;display:grid;place-items:center;background:#151316ee;padding:25px;text-align:center;z-index:5}#stage-error[hidden]{display:none}.editor{border:1px solid #ffffff20;border-radius:24px;background:#1b1818;overflow:hidden}.tabstrip{display:flex;gap:6px;padding:10px;border-bottom:1px solid #ffffff20}.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;min-height:68px;padding:10px 7px;border:1px solid transparent;border-radius:16px;background:none;font-size:11px}.tab svg{width:24px;height:24px}.tab[aria-selected=true]{color:#ffb47c;background:#ff8b3f16;border-color:#ff8b3f90}#fields{padding:18px;min-height:280px}.group h3{font-size:12px;margin:0 0 12px;font-weight:650;color:#d9c6b8}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:20px}.item-tile{display:flex;min-width:0;min-height:112px;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px solid #ffffff29;border-radius:18px;background:#ffffff05;padding:12px;font-size:12px}.item-tile svg{width:65px;height:60px;fill:none;stroke:currentColor;stroke-width:2}.item-tile[data-field=model]{min-height:95px}.item-tile .character-initial{font-size:32px;font-weight:800;color:#ffb47c}.item-tile[aria-pressed=true]{border:2px solid #ff984b;background:#ff8b3f12}.swatches{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}.swatch{width:40px;height:40px;border-radius:50%;border:2px solid #ffffff70;background:var(--color);padding:0}.swatch[aria-pressed=true]{outline:3px solid #ff984b;outline-offset:3px}.height-choices{display:flex;gap:8px;margin-bottom:20px}.height-choices button{flex:1;border:1px solid #ffffff35;border-radius:12px;background:#ffffff08;padding:12px 8px;min-height:46px;font-size:12px}.height-choices button[aria-pressed=true]{border-color:#ff984b;color:#ffb47c}.actions{display:flex;flex-wrap:wrap;gap:10px;padding:16px;border-top:1px solid #ffffff20;background:#1b1818}.actions button{min-height:48px;border-radius:99px;border:1px solid #ffffff40;background:none;padding:12px 18px;font-size:13px;font-weight:750}.actions #save{flex:1;background:#ff8b3f;color:#24150b;border-color:#ff8b3f}.actions #download{width:44px;min-width:44px;padding:0;font-size:20px}#status{width:100%;min-height:18px;font-size:12px;color:#d5c5b8}footer{padding:18px;text-align:center;font-size:11px;color:#b5a79a}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(max-width:760px){header{height:56px}main{padding:12px 10px 24px}h1{font-size:19px;margin:0 4px 12px}.grid{grid-template-columns:1fr;gap:12px}.stage{position:sticky;top:8px;z-index:3;height:43svh;min-height:300px;max-height:480px;border-radius:24px}.editor{border-radius:24px}.tabstrip{padding:7px}.tab{min-height:58px;padding:7px;font-size:10px}.tab svg{width:22px;height:22px}#fields{min-height:0;padding:16px}.choices{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:16px}.item-tile{min-height:90px;padding:8px 4px;font-size:10px;border-radius:14px}.item-tile svg{width:48px;height:48px}.item-tile[data-field=model]{min-height:85px}.actions{position:sticky;bottom:0;padding:12px}.swatches{gap:13px}.stage-tools{bottom:10px}}@media(max-width:360px){.choices{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;
const CLIENT = String.raw`
(()=>{"use strict";
const options=window.AKI_AVATAR_OPTIONS,authored=window.AKI_AUTHORED,t=text=>window.AKI_AVATAR_TEXT[text]||text;
const fields=document.querySelector('#fields'),area=document.querySelector('#avatar-stage'),status=document.querySelector('#status'),save=document.querySelector('#save'),reset=document.querySelector('#reset'),failure=document.querySelector('#stage-error');
let current=null,saved=null,hasSaved=false,saving=false,rendering=true,tab='Character',stage=null;
const pretty=value=>value.charAt(0).toUpperCase()+value.slice(1).replaceAll('-',' ');
function message(text){status.textContent=t(text)}
function changed(){return JSON.stringify(current)!==JSON.stringify(saved)}
function dirty(){return !hasSaved||changed()}
function buttons(){save.disabled=!current||!dirty()||saving||rendering;reset.disabled=!current||!changed()||saving;document.querySelector('#download').disabled=rendering}
function symbol(slot,value){const hair={crop:'M16 35Q12 11 32 10Q52 11 48 35L44 24L20 24Z',quiff:'M16 35Q8 4 35 8L51 5Q58 24 46 34L43 22L21 26Z',long:'M14 53V28Q14 8 32 8Q50 8 50 28V53L41 48V27H23V48Z',bun:'M25 12Q18 1 32 1Q46 1 39 12M15 34Q14 10 32 10Q50 10 49 34L43 22H21Z'};const tops={tee:'M20 10L7 20L14 33L21 29V55H44V29L51 33L58 20L45 10L39 15H26Z',hoodie:'M22 10L9 20L5 54H18L22 31V56H44V31L48 54H61L56 20L43 10L37 16H28ZM23 47H43',jacket:'M22 8L8 20L4 56H18L22 30V62H44V30L48 56H61L56 20L43 8L37 15H28Z',sweater:'M22 10L10 19L3 51L16 55L23 31V57H43V31L50 55L62 51L55 19L43 10L38 16H27Z'};return '<svg viewBox="0 0 66 66" aria-hidden="true"><path d="'+(slot==='hair'?hair[value]:tops[value])+'"/></svg>'}
function tile(key,value,label,visual){const b=document.createElement('button');b.type='button';b.className='item-tile';b.dataset.field=key;b.dataset.value=value;b.setAttribute('aria-label',t(key==='model'?'Character model':key==='hair'?'Hairstyle':'Top')+' '+t(label));b.setAttribute('aria-pressed',String(current[key]===value));b.innerHTML=visual;const text=document.createElement('span');text.textContent=t(label);b.append(text);return b}
function palette(section,key,label){const h=document.createElement('h3');h.textContent=t(label);section.append(h);const line=document.createElement('div');line.className='swatches';line.setAttribute('role','group');line.setAttribute('aria-label',t(label));for(const value of options[key]||[]){if(!authored.palettes[key]?.[value])continue;const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.field=key;b.dataset.value=value;b.style.setProperty('--color',authored.palettes[key][value]);b.setAttribute('aria-label',t(label)+' '+t(pretty(value)));b.setAttribute('aria-pressed',String(current[key]===value));line.append(b)}section.append(line)}
function draw(){const previous=document.activeElement,focusField=previous?.dataset?.field,focusValue=previous?.dataset?.value;fields.replaceChildren();const section=document.createElement('section');section.className='group';if(tab==='Character'){const choices=document.createElement('div');choices.className='choices';for(const c of authored.characters)choices.append(tile('model',c.id,c.name,'<span class="character-initial" aria-hidden="true">'+(c.name==='Rain'?'R ♀':'S ♂')+'</span>'));section.append(choices);const h=document.createElement('h3');h.textContent=t('Height');section.append(h);const heights=document.createElement('div');heights.className='height-choices';for(const value of options.height){const b=document.createElement('button');b.type='button';b.dataset.field='height';b.dataset.value=value;b.textContent=t(pretty(value));b.setAttribute('aria-label',t('Height')+' '+t(pretty(value)));b.setAttribute('aria-pressed',String(current.height===value));heights.append(b)}section.append(heights)}else if(tab==='Face'){palette(section,'skin','Skin tone');palette(section,'eyeColor','Eye colour')}else{const slot=tab==='Hair'?'hair':'top';const group=authored.catalogue[current.model].find(group=>group.slot===slot);const choices=document.createElement('div');choices.className='choices';for(const item of group?.items||[])choices.append(tile(slot,item.value,slot==='top'?({tee:'Original',hoodie:'Layered',jacket:'Longline',sweater:'Relaxed'}[item.value]):pretty(item.value),symbol(slot,item.value)));section.append(choices);palette(section,slot==='hair'?'hairColor':'topColor',slot==='hair'?'Hair colour':'Top colour');if(slot==='top'){palette(section,'bottomColor','Trousers colour');palette(section,'shoeColor','Shoe colour')}}
fields.append(section);document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===tab));b.tabIndex=b.dataset.tab===tab?0:-1;b.id='tab-'+b.dataset.tab;b.setAttribute('aria-controls','fields')});fields.setAttribute('role','tabpanel');fields.setAttribute('aria-labelledby','tab-'+tab);stage?.focus?.(tab==='Face'||tab==='Hair'?'head':'full');if(focusField)Array.from(fields.querySelectorAll('[data-field]')).find(b=>b.dataset.field===focusField&&b.dataset.value===focusValue)?.focus({preventScroll:true})}
function change(patch){if(patch.model){patch.bodyStyle=patch.model==='snow-v4'?'masculine':'feminine';const hair=authored.catalogue[patch.model].find(g=>g.slot==='hair').items;if(!hair.some(i=>i.value===current.hair))patch.hair=hair[0].value}current={...current,...patch};draw();buttons();if(stage){void stage.setAppearance(current);message(dirty()?'Unsaved changes':'Your saved look is ready.')}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(!current)return;tab=b.dataset.tab;draw();fields.focus({preventScroll:true})}));document.querySelector('.tabstrip').addEventListener('keydown',event=>{if(!current||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=Array.from(document.querySelectorAll('[data-tab]')),index=tabs.findIndex(b=>b.dataset.tab===tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tab=tabs[next].dataset.tab;draw();tabs[next].focus({preventScroll:true})});
fields.addEventListener('click',event=>{const b=event.target.closest('button[data-field]');if(!current||!b||!options[b.dataset.field]?.includes(b.dataset.value))return;change({[b.dataset.field]:b.dataset.value})});
document.querySelector('#rotate').addEventListener('click',()=>stage?.rotate(Math.PI/3));document.querySelector('#zoom-in').addEventListener('click',()=>stage?.zoom?.(1));document.querySelector('#zoom-out').addEventListener('click',()=>stage?.zoom?.(-1));document.querySelector('#download').addEventListener('click',()=>{if(!stage)return;try{const a=document.createElement('a');a.href=stage.screenshot();a.download='akipals-3d-preview.png';a.click()}catch{message('Cannot export a screenshot on this browser.')}});
reset.addEventListener('click',()=>{if(!saved)return;current={...saved};draw();buttons();void stage?.setAppearance(current);message('Restored your saved 3D look.')});save.addEventListener('click',async()=>{if(!current||saving||rendering||!dirty())return;saving=true;buttons();message('Saving your avatar...');try{const response=await fetch('/pals/identity',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({appearance:{...current},save:true})});const result=await response.json();if(!response.ok)throw Error(result.error||'Save failed');saved={...result.appearance};hasSaved=true;message('Saved to your AkiPasa account.')}catch(error){message(error.message||'Previous saved look unchanged.')}finally{saving=false;buttons()}});
function showError(msg){rendering=true;area.dataset.ready='error';buttons();failure.hidden=false;failure.textContent=t(msg);message('3D could not render on this device.')}
area.addEventListener('akipals:loading',()=>{rendering=true;area.dataset.ready='loading';buttons()});area.addEventListener('akipals:rendered',()=>{rendering=false;buttons();failure.hidden=true;area.dataset.ready='true'});area.addEventListener('akipals:error',event=>showError(event.detail?.message||'3D model failed to load.'));
(async()=>{try{if(!window.AkiPals3D)throw Error('3D runtime not loaded. Refresh to retry.');const response=await fetch('/pals/identity',{credentials:'same-origin',cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'Cannot load saved avatar.');current={...data.appearance};if(current.model!=='rain-v3'&&current.model!=='snow-v4')current.model=current.bodyStyle==='masculine'?'snow-v4':'rain-v3';current.bodyStyle=current.model==='snow-v4'?'masculine':'feminine';const hair=authored.catalogue[current.model].find(g=>g.slot==='hair').items;if(!hair.some(i=>i.value===current.hair))current.hair=current.model==='snow-v4'?'crop':'long';saved={...current};hasSaved=Boolean(data.saved);stage=window.AkiPals3D.mount(area);draw();buttons();void stage.setAppearance(current);message(data.saved?'Saved character loaded.':'Ready')}catch(error){showError(error.message||'Could not load the character studio.')}})();window.addEventListener('pagehide',()=>{rendering=true;buttons();stage?.dispose()},{once:true});window.addEventListener('pageshow',event=>{if(event.persisted)window.location.reload()});
})();
`;
export function identityPreviewHtml(
  nonce: string,
  locale: "en" | "es" = "en",
): string {
  const text: Record<string, string> = {
    ...SPANISH,
    Wardrobe: "Armario",
    Original: "Original",
    Layered: "Capas",
    Longline: "Largo",
    Relaxed: "Holgado",
    "Trousers colour": "Color del pantalón",
    "Shoe colour": "Color del calzado",
    Cancel: "Cancelar",
    Ready: "Listo",
    "Zoom in": "Acercar",
    "Zoom out": "Alejar",
    "Rotate character": "Girar personaje",
    Save: "Guardar",
    "Export preview": "Exportar vista",
    "Character model Rain": "Personaje Rain",
    "Character model Snow": "Personaje Snow",
  };
  const t = (value: string) => (locale === "es" ? text[value] || value : value);
  const icon = (path: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="${path}"/></svg>`;
  const tabs = [
    [
      "Character",
      "M7 8a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M3 22v-3a9 9 0 0 1 18 0v3",
    ],
    ["Face", "M5 5Q12 0 19 5V13Q19 22 12 23Q5 22 5 13ZM8 11h1M15 11h1M9 17h6"],
    ["Hair", "M4 19V9a8 8 0 0 1 16 0v10M4 11l7-6l3 5h6M8 15v7M16 15v7"],
    ["Outfit", "M8 3L2 7l3 5l3-2v12h8V10l3 2l3-5l-6-4l-2 3h-4Z"],
  ];
  const authored = {
    characters: AUTHORED_CHARACTER_PRESETS,
    catalogue: {
      "rain-v3": authoredWardrobeCatalogue("rain-v3"),
      "snow-v4": authoredWardrobeCatalogue("snow-v4"),
    },
    palettes: APPEARANCE_PALETTES,
  };
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#101014"><title>${t("AkiPals | Wardrobe")}</title><link rel="icon" href="/icon.svg"><style nonce="${nonce}">${STYLE}</style></head><body><header><a class="brand" href="/${locale}" aria-label="${t("Return to AkiPasa")}">Aki<em>Pals</em></a><a class="world-link" href="/pals/world?lang=${locale}">◉ ${t("Enter AkiWorld")} ↗</a></header><main><h1>${t("Wardrobe")}</h1><div class="grid"><section class="stage" aria-label="${t("Your avatar preview")}"><div id="avatar-stage" aria-label="${t("Rotatable 3D avatar")}"></div><div id="stage-error" hidden></div><div class="stage-tools"><button id="zoom-out" type="button" aria-label="${t("Zoom out")}">−</button><button id="rotate" type="button" aria-label="${t("Rotate character")}">⤾</button><button id="zoom-in" type="button" aria-label="${t("Zoom in")}">+</button></div></section><section class="editor" aria-label="${t("Avatar editor controls")}"><div class="tabstrip" role="tablist" aria-label="${t("Avatar customization")}">${tabs.map(([name, path]) => `<button class="tab" type="button" data-tab="${name}" role="tab" aria-selected="${name === "Character"}">${icon(path)}<span>${t(name)}</span></button>`).join("")}</div><div id="fields" tabindex="-1"></div><div class="actions"><button id="reset" type="button" disabled>${t("Cancel")}</button><button id="save" type="button" disabled>${t("Save")}</button><button id="download" type="button" aria-label="${t("Export preview")}" disabled>↓</button><span id="status" role="status" aria-live="polite">${t("Loading your 3D character…")}</span></div></section></div></main><footer><a href="/pals/models/professional/ATTRIBUTION.txt" target="_blank" rel="noopener">${t("Character credits")}</a></footer><script nonce="${nonce}" src="/pals/runtime/creator.min.js?v=${PALS_RENDERER_VERSION}"></script><script nonce="${nonce}">window.AKI_AVATAR_TEXT=${JSON.stringify(locale === "es" ? text : {})};window.AKI_AVATAR_OPTIONS=${JSON.stringify(APPEARANCE_OPTIONS)};window.AKI_AUTHORED=${JSON.stringify(authored)};${CLIENT}</script></body></html>`;
}
