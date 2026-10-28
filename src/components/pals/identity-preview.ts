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
`;
const CLIENT = String.raw`
(()=>{"use strict";
const options=window.AKI_AVATAR_OPTIONS;
const sections=[
["Face",[["skin","Skin tone"],["face","Face shape"],["eyes","Eye shape"],["eyeColor","Eye colour"],["brows","Eyebrows"],["nose","Nose"],["mouth","Mouth"],["ears","Ears"],["chin","Chin"]]],
["Hair",[["hair","Hairstyle"],["hairColor","Hair colour"]]],
["Body",[["neck","Neck"],["shoulders","Shoulders"],["height","Height"],["build","Body build"]]],
["Clothes",[["top","Free starter top"],["topColor","Top colour"]]]
];
const fields=document.querySelector("#fields"), portrait=document.querySelector("#portrait"),
status=document.querySelector("#status"),save=document.querySelector("#save"),reset=document.querySelector("#reset");
let current=null,saved=null,seq=0,saving=false;
const pretty=s=>s.charAt(0).toUpperCase()+s.slice(1).replaceAll("-"," ");
function message(v){status.textContent=v}
function dirty(){return JSON.stringify(current)!==JSON.stringify(saved)}
function buttons(){save.disabled=!current||!dirty()||saving;reset.disabled=!current||saving}
function inputs(){
 fields.replaceChildren();
 for(const [group,items] of sections){
  const section=document.createElement("section");section.className="group";
  const heading=document.createElement("h3");heading.textContent=group;section.append(heading);
  const grid=document.createElement("div");grid.className="fields";
  for(const [key,label] of items){
   const wrapper=document.createElement("label");wrapper.textContent=label;
   const select=document.createElement("select");select.name=key;
   for(const option of options[key]){const o=document.createElement("option");o.value=option;o.textContent=pretty(option);select.append(o)}
   select.value=current[key];wrapper.append(select);grid.append(wrapper);
  }
  section.append(grid);fields.append(section);
 }
}
async function send(config,write=false){
 const request=++seq;if(write){saving=true;buttons();message("Saving your look…")}
 try{
  const response=await fetch("/pals/identity",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({appearance:config,save:write})});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"Could not update avatar.");
  if(write){saved={...config};message("Saved to your AkiPasa account.")}
  if(request===seq){portrait.innerHTML=result.portrait;if(!write)message(dirty()?"Unsaved changes":"Saved look restored.");}
 }catch(err){if(request===seq||write)message(err.message||"Unable to preview. Saved look unchanged.")}
 finally{if(write)saving=false;buttons()}
}
fields.addEventListener("change",event=>{
 const select=event.target;if(!current||!select.matches("select"))return;
 current={...current,[select.name]:select.value};buttons();message("Updating your preview…");
 void send({...current});
});
save.addEventListener("click",()=>{if(current&&!saving)void send({...current},true)});
reset.addEventListener("click",()=>{if(!saved)return;current={...saved};inputs();buttons();void send({...current})});
(async()=>{
 try{
  const response=await fetch("/pals/identity",{credentials:"same-origin",cache:"no-store"}),data=await response.json();
  if(!response.ok)throw new Error(data.error||"Could not load avatar.");
  current={...data.appearance};saved={...data.appearance};portrait.innerHTML=data.portrait;inputs();buttons();
  message(data.saved?"Your saved look is ready.":"Customise your starter avatar, then save it.");
 }catch(err){message(err.message||"Studio unavailable. Please reload.")}
})();
})();
`;
export function identityPreviewHtml(nonce: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#080c17"><title>AkiPals | Be you. Go places.</title><link rel="icon" href="/icon.svg"><style nonce="${nonce}">${STYLE}</style></head>
<body><header><a class="brand" href="/en" aria-label="Return to AkiPasa">Aki<em>Pals</em></a><span class="pill">✦ Private identity studio</span></header>
<main><p class="eyebrow">AkiPals / Your digital self</p><h1>Be you. <em>Go places.</em></h1>
<p class="lede">Create your own character, right down to the details. Dress your way, then take that identity into the real-world places you discover. No levels, loot boxes or story grinding.</p>
<div class="grid"><section class="panel stage" aria-label="Your avatar preview"><h2>One of one</h2><div id="portrait" role="img" aria-label="Live illustration of your avatar"></div><div class="stage-caption">Looking like yourself.<small>Made with original AkiPasa artwork. Every starter feature is free.</small></div></section>
<section class="panel editor"><h2>Create your look.</h2><p>Customize your face, hairstyle, proportions and free clothes. Changes preview immediately. You choose when to save.</p><div id="fields" aria-label="Avatar editor controls"></div><div class="actions"><button id="save" type="button" class="primary" disabled>Save my look</button><button id="reset" type="button" disabled>Restore saved look</button><span id="status" role="status" aria-live="polite">Loading your identity…</span></div></section></div>
<div class="notes"><div class="note"><strong>✧ Personal wardrobe</strong><p>Free starter clothes now. Earned city drops and optional individually priced branded collections later. No paid randomness.</p></div><div class="note"><strong>◎ Places become memories</strong><p>Future verified check-ins can unlock profile keepsakes and cosmetics, without combat stats or RPG mechanics.</p></div><div class="note"><strong>◉ Where's Poppin'?</strong><p>Aggregate venue activity and separate optional social presence are future features. No location-sharing in this preview.</p></div></div>
</main><footer>Private AkiPals preview · No payments · No location sharing</footer>
<script nonce="${nonce}">window.AKI_AVATAR_OPTIONS=${JSON.stringify(APPEARANCE_OPTIONS)};${CLIENT}</script></body></html>`;
}
