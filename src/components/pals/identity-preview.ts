import { APPEARANCE_OPTIONS } from "@/lib/pals/avatar-v2";
const STYLE = String.raw`
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif;background:#080c17;color:#f7f3ef}
*{box-sizing:border-box}body{margin:0;min-height:100svh;background:radial-gradient(circle at 25% 15%,#38283c,transparent 40%),radial-gradient(circle at 80% 55%,#1c3541,transparent 50%),#080c17}
button,select{font:inherit}button{cursor:pointer}:focus-visible{outline:3px solid #ffb080;outline-offset:3px}
a{color:inherit}header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px clamp(17px,5vw,55px);border-bottom:1px solid #ffffff25}
.brand{text-decoration:none;font-weight:900;font-size:22px;letter-spacing:-.045em}.brand em{font-style:normal;color:#ff9d71}
.pill{border:1px solid #ffffff34;padding:8px 12px;border-radius:30px;font-size:12px;color:#cecbd4}
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
button.primary{background:#ff854a;color:#241f28;border-color:#ff854a}button:disabled{opacity:.45;cursor:default}
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
#avatar-stage{height:630px;width:100%;touch-action:none;min-height:630px}
#avatar-stage canvas{display:block}
.stage-caption{position:absolute;z-index:3;left:18px;right:18px;bottom:15px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}
.stage-caption small{font-size:11px;max-width:230px}.stage-caption .rotate{color:#fff;cursor:pointer;border:1px solid #ffffff60;border-radius:100px;background:#111723a8;padding:9px 14px}
.stage-caption strong{font-size:15px;line-height:1.1}
#stage-error{position:absolute;z-index:4;inset:0;background:#141927eb;display:grid;place-items:center;padding:24px;text-align:center;font-size:15px;color:#f3d2ba}
#stage-error[hidden]{display:none}
.editor{display:flex;flex-direction:column;min-height:630px;background:linear-gradient(155deg,#282735ee,#141c2bee)}
.editor >p{margin-top:4px}
.tabstrip{display:flex;gap:5px;overflow-x:auto;margin:13px 0 12px;padding-bottom:12px;border-bottom:1px solid #ffffff1c}
.tab{white-space:nowrap;padding:10px 10px;min-height:41px;font-size:12px;background:#ffffff0b;border:1px solid #ffffff2c;border-radius:12px}
.tab[aria-selected="true"]{background:#ff854a28;color:#ffc3a2;border-color:#ff955e;box-shadow:inset 0 -2px #ff854a}
#fields{flex:1}
.group h3{margin:3px 0 15px;font-size:14px;color:#ffc19e}
.color-group{grid-column:1/-1;border-top:1px solid #ffffff23;padding-top:12px}
.color-group strong{display:block;font-size:12px;margin-bottom:11px}
.swatches{display:flex;gap:9px;flex-wrap:wrap}
.swatch{width:35px;height:35px;min-height:0;padding:0;border-radius:100%;background:var(--color);border:2px solid #ffffff48}
.swatch[aria-pressed="true"]{box-shadow:0 0 0 3px #ff854a57;border:3px solid #ff9659}
.presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:0 0 16px}
.presets button{min-height:58px;border-radius:12px;padding:9px 12px;text-align:left;background:linear-gradient(135deg,#3f3844,#1e2634);font-size:12px}
.presets button[aria-pressed="true"]{border-color:#ff955e;background:linear-gradient(135deg,#5a332e,#202232)}
.actions{margin-top:auto}.actions button.primary{flex:1;background:linear-gradient(120deg,#ff914c,#ff7148);font-size:15px;box-shadow:0 7px 23px #f7754040}
.actions #download{width:100%;background:none;border:0;font-size:12px;min-height:30px;color:#afb6c2;text-align:left;padding:0}
@media(max-width:860px){.grid{grid-template-columns:1fr}.stage,#avatar-stage{min-height:495px;height:495px}.editor{min-height:400px}}
@media(max-width:480px){.stage{border-radius:23px 23px 0 0}.stage,#avatar-stage{height:456px;min-height:456px}.stage h2{font-size:10px}.editor{border-radius:0 0 23px 23px;padding:22px 16px}.tab{font-size:11px;padding:10px 8px}.stage-caption strong{font-size:13px}.stage-caption small{font-size:10px}}
`;
const CLIENT = String.raw`
(()=>{"use strict";
const options=window.AKI_AVATAR_OPTIONS;
const tabs={
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
let current=null,saved=null,saving=false,tab="Hair",stage=null;
const pretty=s=>s.charAt(0).toUpperCase()+s.slice(1).replaceAll("-"," ");
function message(s){status.textContent=s}
function dirty(){return JSON.stringify(current)!==JSON.stringify(saved)}
function buttons(){save.disabled=!current||!dirty()||saving;reset.disabled=!current||!dirty()||saving}
function draw(){
 fields.replaceChildren();
 const title=document.createElement("h3");title.textContent=tab==="Outfit"?"Style your story.":tab==="Hair"?"The hair studio":tab;
 const section=document.createElement("section");section.className="group";section.append(title);
 if(tab==="Outfit"){
  const box=document.createElement("div");box.className="presets";
  for(const [id,p] of Object.entries(presets)){
   const btn=document.createElement("button");btn.type="button";btn.dataset.preset=id;
   btn.textContent={street:"Streetwear",night:"Night out",casual:"Casual day",beach:"Beach plan"}[id];
   btn.setAttribute("aria-pressed",String(Object.keys(p).every(k=>current[k]===p[k])));box.append(btn);
  }
  section.append(box);
 }
 const grid=document.createElement("div");grid.className="fields";
 for(const [key,text] of tabs[tab]){
  if(colorSets[key]){
   const wrap=document.createElement("div");wrap.className="color-group";
   const heading=document.createElement("strong");heading.textContent=text;wrap.append(heading);
   const line=document.createElement("div");line.className="swatches";line.setAttribute("role","group");line.setAttribute("aria-label",text);
   for(const choice of options[key]){
    const btn=document.createElement("button");btn.type="button";btn.className="swatch";
    btn.dataset.field=key;btn.dataset.value=choice;btn.style.setProperty("--color",colorSets[key][choice]);
    btn.setAttribute("aria-label",text+" "+pretty(choice));btn.setAttribute("aria-pressed",String(current[key]===choice));
    line.append(btn);
   }wrap.append(line);grid.append(wrap);
  }else{
   const label=document.createElement("label");label.textContent=text;
   const select=document.createElement("select");select.name=key;select.setAttribute("aria-label",text);
   for(const choice of options[key]){
    const opt=document.createElement("option");opt.value=choice;opt.textContent=pretty(choice);select.append(opt);
   }select.value=current[key];label.append(select);grid.append(label);
  }
 }
 section.append(grid);fields.append(section);
 document.querySelectorAll("[data-tab]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.tab===tab)));
}
function change(patch){
 current={...current,...patch};draw();buttons();
 if(stage){void stage.setAppearance(current);message(dirty()?"Unsaved changes":"Your saved look is ready.");}
}
document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{if(!current)return;tab=btn.dataset.tab;draw();fields.focus({preventScroll:true})}));
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
 if(!current||saving||!dirty())return;
 saving=true;buttons();message("Saving your avatar...");
 try{
  const copy={...current};
  const response=await fetch("/pals/identity",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:copy,save:true})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"Save failed");
  saved={...result.appearance};message("Saved to your AkiPasa account.");
 }catch(err){message(err.message||"Previous saved look unchanged.")}
 finally{saving=false;buttons()}
});
function showError(msg){failure.hidden=false;failure.textContent=msg;message("3D could not render on this device.")}
area.addEventListener("akipals:rendered",()=>{failure.hidden=true;area.dataset.ready="true"});
area.addEventListener("akipals:error",event=>showError(event.detail?.message||"3D model failed to load."));
(async()=>{
 try{
  if(!window.AkiPals3D)throw new Error("3D runtime not loaded. Refresh to retry.");
  const response=await fetch("/pals/identity",{credentials:"same-origin",cache:"no-store"});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Cannot load saved avatar.");
  current={...data.appearance};saved={...data.appearance};
  stage=window.AkiPals3D.mount(area);draw();buttons();void stage.setAppearance(current);
  message(data.saved?"Saved character loaded.":"Free starter character ready. Customise and save!");
 }catch(error){showError(error.message||"Could not load the character studio.")}
})();
window.addEventListener("pagehide",()=>stage?.dispose(),{once:true});
})();
`;
export function identityPreviewHtml(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#080c17"><title>AkiPals | Your 3D character creator</title><link rel="icon" href="/icon.svg"><style nonce="${nonce}">${STYLE}</style></head>
<body><header><a class="brand" href="/en" aria-label="Return to AkiPasa">Aki<em>Pals</em></a><span class="pill">✦ Private 3D studio</span></header>
<main><p class="eyebrow">AkiPals / Your digital self</p><h1>Looking like <em>yourself.</em></h1>
<p class="lede">Your very own 3D character for AkiPasa. Rotate your look, customize your features and mix streetwear pieces.</p>
<div class="grid"><section class="panel stage" aria-label="Your avatar preview"><h2>✦ Real 3D preview</h2><div id="avatar-stage" aria-label="Rotatable 3D avatar"></div><div id="stage-error" hidden></div><div class="stage-caption"><div><strong>One of one. Yours.</strong><small>Drag to rotate, pinch to zoom</small></div><button class="rotate" id="rotate" type="button">⤾ 360°</button></div></section>
<section class="panel editor"><h2>Make it yours.</h2><p>Edit your real 3D character, then save your outfit and look to your account.</p><div class="tabstrip" role="tablist" aria-label="Avatar customization"><button class="tab" type="button" data-tab="Face" role="tab">Face</button><button class="tab" type="button" data-tab="Hair" role="tab" aria-selected="true">Hair</button><button class="tab" type="button" data-tab="Body" role="tab">Body</button><button class="tab" type="button" data-tab="Outfit" role="tab">Outfit</button><button class="tab" type="button" data-tab="Extras" role="tab">Extras</button></div><div id="fields" tabindex="-1" aria-label="Avatar editor controls"></div><div class="actions"><button id="save" type="button" class="primary" disabled>Save my look</button><button id="reset" type="button" disabled>Restore saved look</button><button id="download" type="button">↓ Export a 3D preview image</button><span id="status" role="status" aria-live="polite">Loading your 3D character…</span></div></section></div>
<div class="notes"><div class="note"><strong>✧ Personal wardrobe</strong><p>Free starter clothes now. Earned city drops and optional individually priced branded collections later. No paid randomness.</p></div><div class="note"><strong>◎ Places become memories</strong><p>Future verified check-ins can unlock profile keepsakes and cosmetics, without combat stats or RPG mechanics.</p></div><div class="note"><strong>◉ Where's Poppin'?</strong><p>Aggregate venue activity and separate optional social presence are future features. No location-sharing in this preview.</p></div></div>
</main><footer>Private AkiPals 3D studio · CC0 character bases · No payments · No location sharing</footer>
<script nonce="${nonce}" src="/pals/runtime/creator.min.js"></script><script nonce="${nonce}">window.AKI_AVATAR_OPTIONS=${JSON.stringify(APPEARANCE_OPTIONS)};${CLIENT}</script></body></html>`;
}
