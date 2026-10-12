import { PALS_ARCADE_CLIENT } from "./arcade-client";

export const PALS_CLIENT = String.raw`
(function(){
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={wits:'Wits',energy:'Energy',charm:'Charm',head:'Headwear',body:'Layers',back:'Carry-ons',held:'Extras'};
const icons={home:'⌂',wardrobe:'♧',workshop:'⚒',adventures:'✧',shop:'◇',keepsakes:'◎',arcade:'▦',cast:'♡',settings:'⚙',more:'•••'};
const pages=[['home','Hideout'],['wardrobe','Wardrobe'],['workshop','Workshop'],['adventures','Stories'],['arcade','Arcade'],['shop','Style shop'],['keepsakes','Keepsakes'],['cast','The cast'],['settings','Settings']];
let data=null,tab='home',filter='all',busy=false,selectedFamily='moka',modal=null,retryCommand=null,showMasters=false,toastTimer=null,search='',styleFilter='all',lastFocus=null,refreshingTime=false;
const main=$('#main'), dialog=$('#dialog');
const design=id=>data.catalog.designs.find(d=>d.id===id);
const family=()=>data.catalog.families.find(f=>f.id===(data.state.family||selectedFamily));
const collectionOf=id=>data?.catalog?.v2?.items?.find(item=>item.id===id)?.collectionId;
function track(name,payload={}){
 try{
  fetch('/pals/analytics',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({name,...payload})}).catch(()=>{});
 }catch{}
}
const eq=id=>data.state.equipment.find(i=>i.id===id);
const equipped=item=>Object.values(data.state.equipped).includes(item.id);
const availableNow=()=>Math.min(3,Math.max(0,Math.floor((Date.now()+data.offset)/86400000)-data.state.lastParcelDay));
const btn=(label,action,attrs='',kind='')=>'<button class="btn '+kind+'" data-act="'+action+'" '+attrs+'>'+label+'</button>';
function heading(eyebrow,title,subtitle,extra=''){return '<header class="page-heading"><div><p class="eyebrow">'+eyebrow+'</p><h1 tabindex="-1" id="page-title">'+title+'</h1><p class="subtitle">'+subtitle+'</p></div>'+extra+'</header>'}
function statsHtml(values){return '<div class="stats">'+Object.keys(labels).slice(0,3).map(k=>'<div class="stat"><div class="stat-label">'+labels[k]+'<span>'+(k==='wits'?'◈':k==='energy'?'ϟ':'♡')+'</span></div><strong>'+values[k]+'</strong><div class="stat-line"><i style="width:'+Math.min(100,values[k]/20*100)+'%"></i></div></div>').join('')+'</div>'}
function navButton(id,label){return '<button class="nav-button" data-tab="'+id+'" '+(tab===id?'aria-current="page"':'')+'><span class="nav-icon" aria-hidden="true">'+icons[id]+'</span><span>'+label+'</span></button>'}
function applyTheme(theme){
 const next=theme==='light'?'light':'dark';document.documentElement.dataset.theme=next;
 const control=$('#pals-theme');const label=next==='dark'?'Switch to light theme':'Switch to dark theme';
 if(control){control.setAttribute('aria-label',label);control.title=label;control.innerHTML='<span aria-hidden="true">'+(next==='dark'?'☀':'☾')+'</span>'}
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',next==='dark'?'#0c1422':'#f3f4f0');
 try{localStorage.setItem('akipals-theme',next)}catch{}
}
try{applyTheme(localStorage.getItem('akipals-theme')||(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'))}catch{applyTheme('dark')}
if(typeof ResizeObserver==='function')new ResizeObserver(()=>document.documentElement.style.setProperty('--shell-height',Math.ceil($('.topbar').getBoundingClientRect().height)+'px')).observe($('.topbar'));
function savedStatus(){
 const message=busy?'Saving…':retryCommand?'Save needs a retry':navigator.onLine?'Account saved':'Offline · reconnect to save';
 $('#saved').textContent=message;const status=$('#connection-status');if(status)status.textContent=message;
}
function nav(){
 $('#nav').innerHTML='<div class="nav-label">YOUR LITTLE WORLD</div>'+pages.map(([id,label])=>navButton(id,label)).join('')+'<div class="side-note"><strong>Little moments. Lasting pals.</strong>Dress up. Head out. Come back whenever.<br><br>English-language private playtest</div>';
 const mobile=[['home','Hideout'],['wardrobe','Wardrobe'],['adventures','Stories'],['arcade','Arcade']];
 $('#mobile-nav').innerHTML=mobile.map(([id,label])=>navButton(id,label)).join('')+navButton('more','More');
 if(!mobile.some(([id])=>id===tab))$('#mobile-nav [data-tab="more"]')?.setAttribute('aria-current','page');
 $('#balances').innerHTML='<div class="balance" title="Threads: earned by playing"><span class="symbol" aria-hidden="true">◇</span><strong>'+data.state.threads+'</strong><span class="balance-label">Threads</span></div><div class="balance" title="Scrap: used in the workshop"><span class="symbol" aria-hidden="true">⚒</span><strong>'+data.state.scrap+'</strong><span class="balance-label">Scrap</span></div><span id="connection-status"></span>';
 savedStatus();
 const adopted=Boolean(data.state.family);$('#nav').hidden=!adopted;$('#mobile-nav').style.display=adopted?'':'none';
}
function stage(){
 const f=family(),bond=data.derived.journey.bond;
 return '<div class="stage" style="--pal-accent:'+esc(f.style?.accent||'#b1cebc')+'"><div class="stage-top"><span class="tag"><i></i>'+esc(f.style?.title||'Your hideout')+'</span><span class="tag">Bond level '+bond.level+'</span></div><button data-act="boop" class="pal-art" aria-label="Say hello to '+esc(data.state.name)+'">'+data.derived.portrait+'</button><span class="stage-caption">Tap your Pal to say hello</span></div>';
}
function bondAndCare(){
 const j=data.derived.journey,b=j.bond;
 return '<div class="bond-track"><div class="bond-heading"><span><span class="bond-symbol" aria-hidden="true">♡</span> '+esc(b.title)+'</span><span>'+b.xp+' XP</span></div><div class="progress" role="progressbar" aria-label="Bond progress" aria-valuenow="'+b.percent+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+b.percent+'%"></i></div><p>'+(b.nextTitle?b.remaining+' XP to '+esc(b.nextTitle):'You and your Pal are friends for life.')+'</p></div><div class="care-row" role="group" aria-label="Spend a moment with your Pal">'+j.care.map(c=>'<button class="care-button '+(c.done?'done':'')+'" data-act="care" data-activity="'+c.id+'" title="'+esc(c.description)+(c.done?' Today’s bond XP already earned; you can still hang out.':' Earn '+c.xp+' bond XP once today.')+'"><span aria-hidden="true">'+({snack:'◒',play:'✦',rest:'☾'}[c.id])+'</span><strong>'+({snack:'Snack',play:'Play',rest:'Chill'}[c.id])+'</strong><small>'+(c.done?'Again ♡':'+'+c.xp+' XP')+'</small></button>').join('')+'</div>';
}
function journeyCards(){
 const j=data.derived.journey,d=j.daily,w=j.weekly;
 return '<section class="panel journey-card"><div class="section-head"><div><p class="card-label">A LITTLE EVERY DAY</p><h2>Today, together.</h2></div><span class="journey-count">'+d.completed+'<small>/'+d.total+'</small></span></div><div class="journey-tasks">'+d.tasks.map(t=>'<button class="journey-task '+(t.done?'done':'')+'" data-act="'+(t.id==='care'?'care-focus':'tab')+'" '+(t.id==='care'?'':'data-tab-target="'+t.targetTab+'"')+' title="'+esc(t.description)+'" aria-label="'+esc(t.label)+(t.done?' · completed':'. '+esc(t.description))+'"><span class="task-check" aria-hidden="true">'+(t.done?'✓':'')+'</span><span><strong>'+esc(t.label)+'</strong><small>'+esc(t.description)+'</small></span><span class="task-arrow" aria-hidden="true">'+(t.done?'':'↗')+'</span></button>').join('')+'</div><div class="journey-reward"><span>◇ '+(d.reward.threads*Math.max(1,d.availableBonuses))+' Threads <small>+ '+(d.reward.scrap*Math.max(1,d.availableBonuses))+' Scrap · '+(d.reward.xp*Math.max(1,d.availableBonuses))+' XP</small></span>'+btn(d.ready?'Collect'+(d.availableBonuses>1?' ×'+d.availableBonuses:'')+' ↗':d.claimed?'Collected ✓':'Complete all 3','journey-claim','data-period="day" '+(d.ready?'':'disabled'),d.ready?'primary':'')+'</div>'+(d.banked?'<p class="small muted">'+d.banked+' completed bonus'+(d.banked===1?' is':'es are')+' safely waiting.</p>':'')+'</section><section class="panel weekly-card"><div class="section-head"><div><p class="card-label">THIS WEEK’S LITTLE QUEST</p><h2>Three stories. Your way.</h2></div><span class="journey-count">'+w.completed+'<small>/'+w.total+'</small></span></div><p class="small muted">Finish three different stories this week. Practice replays count.</p><div class="progress" role="progressbar" aria-label="Weekly story progress" aria-valuenow="'+w.completed+'" aria-valuemin="0" aria-valuemax="'+w.total+'"><i style="width:'+Math.round(w.completed/w.total*100)+'%"></i></div><div class="journey-reward"><span>◇ '+(w.reward.threads*Math.max(1,w.availableBonuses))+' Threads <small>+ '+(w.reward.scrap*Math.max(1,w.availableBonuses))+' Scrap · '+(w.reward.xp*Math.max(1,w.availableBonuses))+' XP</small></span>'+btn(w.ready?'Collect'+(w.availableBonuses>1?' ×'+w.availableBonuses:'')+' ↗':w.claimed?'Play another':'Find a story',w.ready?'journey-claim':'tab',w.ready?'data-period="week"':'data-tab-target="adventures"',w.ready?'primary':'soft')+'</div>'+(w.banked?'<p class="small muted">Previous completed bonuses are waiting too.</p>':'')+'</section>';
}
function slotRow(){return '<div class="slot-row">'+['head','body','back','held'].map(slot=>{const item=eq(data.state.equipped[slot]);return '<button class="slot-button" data-act="slot" data-slot="'+slot+'" aria-label="Open '+labels[slot]+' wardrobe"><div class="slot-art">'+(item?design(item.appearance).svg:'<span style="font-size:29px">+</span>')+'</div><span>'+labels[slot]+'</span></button>'}).join('')+'</div>'}
function home(){
 const s=data.state,count=availableNow(),goal=s.goal?design(s.goal):null;
 const parcel='<section class="panel parcel-box"><div class="parcel-row"><div class="parcel-art" aria-hidden="true"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M15 36L49 19L85 35L51 53Z" fill="#f2c897" stroke="#6c5960" stroke-width="2"/><path d="M15 36L51 53V86L17 68Z" fill="#c69370" stroke="#6c5960" stroke-width="2"/><path d="M51 53L85 35L83 68L51 86Z" fill="#e6b88a" stroke="#6c5960" stroke-width="2"/><path d="M32 28L67 45V65L58 70V49L23 33Z" fill="#b9d9ca"/><path d="M27 54L42 61V73L27 66Z" fill="#fff0cf"/></svg></div><div class="parcel-text"><p class="card-label">A LITTLE SOMETHING FOR YOU</p><h2>Lost &amp; found</h2><p>'+count+' free parcel'+(count===1?'':'s')+' waiting.</p><div class="parcel-count" aria-label="'+count+' of 3 parcel slots">'+[0,1,2].map(n=>'<i class="'+(n<count?'filled':'')+'"></i>').join('')+'</div></div></div><div class="card-footer"><small>One free parcel a day.<br>Up to three wait for you.</small>'+btn(count?'Open a parcel ↗':'More tomorrow','parcel',count?'':'disabled','primary')+'</div></section>';
 const savings=goal?'<section class="panel savings-card"><p class="card-label">YOUR NEXT FAVOURITE</p><div class="goal-row"><div class="goal-art">'+goal.svg+'</div><div style="flex:1"><h3>'+esc(goal.name)+'</h3><div class="progress"><i style="width:'+Math.min(100,s.threads/goal.price*100)+'%"></i></div><span class="small muted">'+s.threads+' / '+goal.price+' Threads</span></div></div>'+btn(s.threads>=goal.price?'Ready to collect ↗':'Keep saving, or browse ↗','tab','data-tab-target="shop"','wide link')+'</section>':'';
 return heading('YOUR LITTLE WORLD','Small pal. <em>Big plans.</em>','Dress up, head out, and make a little progress together.',btn(s.run?'Continue your story':'Let’s play ↗','tab','data-tab-target="'+(s.run?'adventures':'arcade')+'"','primary'))+'<div class="grid-home"><section class="companion-panel">'+stage()+'<div class="pal-bar"><div><h2>'+esc(s.name)+'</h2><div class="small muted">'+esc(family().name)+' · '+s.wardrobe.length+' looks collected</div></div>'+btn('Rename','rename')+'</div><p class="quote">'+esc(family().personality)+'</p>'+bondAndCare()+'<details class="loadout-disclosure"><summary><strong>Adventure setup</strong><span>'+Object.entries(data.derived.stats).map(([k,v])=>labels[k]+' '+v).join(' · ')+'</span></summary><div>'+statsHtml(data.derived.stats)+slotRow()+btn('Open workshop ↗','tab','data-tab-target="workshop"','wide link')+'</div></details><div class="quick-actions">'+btn('✧ Stories','tab','data-tab-target="adventures"')+btn('▦ Arcade','tab','data-tab-target="arcade"')+btn('♧ Style','tab','data-tab-target="wardrobe"')+'</div></section><div class="stack">'+parcel+journeyCards()+savings+'</div></div><div class="activity"><strong>'+esc(s.report.title)+'.</strong> '+esc(s.report.text)+'</div>';
}
function matchesDesign(d){
 const query=search.trim().toLowerCase();
 return (filter==='all'||d.slot===filter)&&(styleFilter==='all'||d.styleFamilies?.includes(styleFilter))&&(!query||(d.name+' '+d.rarity+' '+labels[d.slot]).toLowerCase().includes(query));
}
function filters(){
 return '<div class="collection-filters"><label class="search-field"><span class="sr-only">Search your pieces</span><input id="piece-search" type="search" class="input" placeholder="Find a piece…" autocomplete="off" value="'+esc(search)+'"></label><label class="collection-select"><span class="sr-only">Signature collection</span><select id="collection-filter" class="input"><option value="all">All collections</option>'+data.catalog.families.map(f=>'<option value="'+f.id+'" '+(styleFilter===f.id?'selected':'')+'>'+esc(f.style?.title||f.name)+'</option>').join('')+'</select></label></div><div class="toolbar" role="group" aria-label="Equipment slot filter">'+['all','head','body','back','held'].map(slot=>'<button class="chip '+(filter===slot?'active':'')+'" data-act="filter" data-slot="'+slot+'" aria-pressed="'+(filter===slot)+'">'+(slot==='all'?'All pieces':labels[slot])+'</button>').join('')+'<span class="small muted">'+data.state.equipment.length+' / 80 equipment pieces</span></div>';
}
function itemCard(item){const d=design(item.appearance),base=design(item.design);return '<article class="item-card '+base.rarity+'"><div class="item-visual"><i class="rarity-dot"></i>'+d.svg+(equipped(item)?'<span class="equipped-pill">Equipped</span>':'')+'</div><div class="item-body"><h3>'+esc(d.name)+'</h3><div class="item-meta">Level '+item.level+' · '+item.sockets.length+' socket'+(item.sockets.length===1?'':'s')+' · '+labels[base.slot]+'</div>'+btn(tab==='workshop'?'Modify equipment':'Style & equip','inspect','data-id="'+item.id+'"')+'<div class="rarity">'+base.rarity+'</div></div></article>'}
function collectionEmpty(){return '<div class="empty"><div class="empty-icon" aria-hidden="true">♧</div><h2>No pieces here just yet.</h2><p>Try another name, slot or collection, or discover a new favourite in the shop.</p>'+btn('Clear filters','reset-filters')+' '+btn('Browse the shop ↗','tab','data-tab-target="shop"','soft')+'</div>'}
function wardrobe(){
 const items=data.state.equipment.filter(i=>matchesDesign(design(i.appearance)));
 return heading('YOUR WARDROBE','Make it unmistakably you.','Every collected look stays yours, even after you recycle its equipment.')+filters()+'<p class="collection-results" role="status">'+items.length+' matching piece'+(items.length===1?'':'s')+'</p>'+(items.length?'<div class="items-grid">'+items.map(itemCard).join('')+'</div>':collectionEmpty());
}
function workshop(){
 const items=data.state.equipment.filter(i=>matchesDesign(design(i.appearance)));
 return heading('THE WORKSHOP','A little fine-tuning.','Upgrade your favourites. Make room for modules. Keep the look you love.')+'<div class="work-layout"><section>'+filters()+'<p class="collection-results" role="status">'+items.length+' matching piece'+(items.length===1?'':'s')+'</p>'+(items.length?'<div class="items-grid">'+items.map(itemCard).join('')+'</div>':collectionEmpty())+'</section><aside class="panel" style="align-self:start"><h2>Parts on the workbench</h2><div class="module-supply">'+['wits','energy','charm'].map(stat=>'<div class="module-card"><span>'+labels[stat]+' +2</span><strong>'+data.state.modules[stat]+' spare</strong></div>').join('')+'</div><p class="small muted">'+data.derived.activeModules+' / 6 active modules equipped.</p><details class="settings-details"><summary>How equipment works</summary><ul class="howto"><li><strong>Upgrade a favourite</strong>Every two equipment levels add a point to its natural attribute.</li><li><strong>Make room</strong>Open up to three sockets on each piece. Every module adds +2.</li><li><strong>Keep the best of both</strong>Merge two copies of the same design. Keep the highest level and socket count.</li><li><strong>Recycle without regrets</strong>Appearances stay forever. Fitted modules return to your supply.</li></ul></details></aside></div>';
}
function adventures(){
 if(data.state.run)return run();
 const day=Math.floor((Date.now()+data.offset)/86400000);
 return heading('STEP OUTSIDE','A small story. A good day.','Ten little adventures, shaped by your Pal’s setup. Pick a place to begin.')+'<div class="story-overview"><div>'+Object.entries(data.derived.stats).map(([k,v])=>'<span class="stat-pill">'+labels[k]+' <strong>'+v+'</strong></span>').join('')+'</div><p>Every story is finishable with basic gear. Earn a reward once per story each UTC day, then replay freely.</p></div><div class="adventure-grid">'+data.catalog.adventures.map((a,i)=>{
 const done=data.state.rewards.includes(day+':'+a.id),symbol=['♫','☕','♧','⌂','☀','◇','✦','ϟ','○','★'][i]||'✦';
 return '<article class="story-card"><div class="story-scene '+a.id+'"><span class="scene-icon" aria-hidden="true">'+symbol+'</span><span class="scene-word">'+esc(a.place)+'</span></div><div class="story-body"><h2>'+esc(a.name)+'</h2><p>'+esc(a.description)+'</p><div class="story-label">'+(done?'✓ Today’s reward collected · free practice':'◇ 35–50 Threads · 12–27 Scrap')+'</div>'+btn(done?'Play again':'Start this story ↗','start','data-id="'+a.id+'"',done?'soft':'primary')+'</div></article>';
 }).join('')+'</div>';
}
function run(){
 const r=data.state.run,a=data.catalog.adventures.find(a=>a.id===r.adventure),finished=r.step>=a.steps.length,last=r.history[r.history.length-1];
 let content=heading('OUT IN THE LITTLE WORLD',esc(a.name),'Your saved loadout: '+Object.entries(r.stats).map(([k,v])=>labels[k]+' '+v).join(' · '),btn(finished?'Back to stories':'Leave','leave'));
 content+='<div class="run-layout"><div class="run-scene"><span>'+esc(a.place)+'</span>'+data.derived.portrait+'</div><div class="step-dots" aria-label="'+r.step+' of 3 scenes completed">'+[0,1,2].map(n=>'<i class="'+(n<r.step?'done':'')+'"></i>').join('')+'</div>';
 if(finished){return content+'<section class="panel"><p class="eyebrow">A STORY TO KEEP</p><h2>Small adventure. Lovely ending.</h2><p class="small muted">'+esc(data.state.report.text)+'</p>'+r.history.map(h=>'<div class="journal"><strong>'+esc(h.title)+(h.bonus?' · Bonus moment ✧':'')+'</strong><p>'+esc(h.result)+'</p></div>').join('')+btn('Back to my hideout','finish','','primary wide')+'</section></div>'}
 if(last)content+='<div class="journal" role="status"><strong>'+esc(last.title)+(last.bonus?' · Bonus moment ✧':'')+'</strong><p>'+esc(last.result)+'</p></div>';
 const step=a.steps[r.step];content+='<p class="eyebrow">SCENE '+(r.step+1)+' OF 3</p><h2 style="font-size:26px">'+esc(step.title)+'</h2><p class="subtitle" style="margin-bottom:18px">'+esc(step.text)+'</p>';
 content+=step.options.map((o,i)=>{const success=r.stats[o.stat]>=o.need;return '<button class="choice" data-act="choice" data-index="'+i+'"><span><strong>'+esc(o.label)+'</strong><small>'+labels[o.stat]+' '+o.need+' needed · You have '+r.stats[o.stat]+(o.need>3?' · Bonus route':' · Gentle route')+'</small></span><span class="check '+(success?'':'low')+'">'+(success?'Ready ✓':'Partial result')+'</span></button>'}).join('');return content+'</div>';
}
function shop(){
 const items=data.catalog.designs.filter(d=>d.source!=='earned'&&matchesDesign(d));
 return heading('THE STYLE SHOP','Wear your kind of weird.','Original looks, collectable collections, and a few excellent accessories.')+'<div class="shop-banner"><div><h2>Your next favourite is in here.</h2><p>Collect with Threads earned by playing. Extra equipment copies can be merged in the workshop.</p></div><strong>◇ '+data.state.threads+'</strong></div>'+filters()+'<p class="collection-results" role="status">'+items.length+' matching piece'+(items.length===1?'':'s')+' · earned Threads only</p>'+(items.length?'<div class="items-grid">'+items.map(d=>'<article class="item-card '+d.rarity+'"><div class="item-visual"><i class="rarity-dot"></i>'+d.svg+(data.state.wardrobe.includes(d.id)?'<span class="equipped-pill">Look collected</span>':'')+'</div><div class="item-body"><h3>'+esc(d.name)+'</h3><div class="item-meta">'+labels[d.slot]+' · 1 socket · Level 1</div><div class="item-buttons">'+btn('◇ '+d.price,'buy','data-id="'+d.id+'" aria-label="Collect '+esc(d.name)+' for '+d.price+' Threads" '+(data.state.threads<d.price?'disabled':''),'primary')+btn(data.state.goal===d.id?'✓':'☆','goal','data-id="'+d.id+'" title="Set savings goal" aria-label="Save towards '+esc(d.name)+'" aria-pressed="'+(data.state.goal===d.id)+'"')+'</div><div class="rarity">'+d.rarity+'</div></div></article>').join('')+'</div>':collectionEmpty());
}
function keepsakes(){return heading('PLACES BECOME PART OF YOU','Earned out there. Worn here.','Real AkiPasa achievements unlock these pieces. Never sold. Never paid randomness.',btn('Sync achievements','claim','','primary'))+'<div class="notice">This first collection recognises verified city-scoped achievements in six cities, plus milestones for 1, 5 and 10 unlocked achievements. There are no pretend check-ins here. More city and category-specific milestone sets can be added after this preview.</div><h2 style="margin-bottom:17px">City keepsakes</h2><div class="city-grid">'+data.catalog.cityCollections.map(city=>{const d=design('city-'+city.key),owned=data.state.claimed.includes(d.id);return '<article class="city-card '+(owned?'':'locked')+'"><div class="city-art">'+d.svg+'</div><h3>'+esc(city.name)+'</h3><p>A city-scoped achievement.<br>A keepsake with three sockets.</p><span class="tag">'+(owned?'✓ Collected':'○ Explore to unlock')+'</span></article>'}).join('')+'</div><h2 style="margin:26px 0 17px">Your explorer story</h2><div class="city-grid">'+['city-cup','explorer-medal','master-crown'].map((id,i)=>{const d=design(id),owned=data.state.claimed.includes(id);return '<article class="city-card '+(owned?'':'locked')+'"><div class="city-art">'+d.svg+'</div><h3>'+esc(d.name)+'</h3><p>'+[1,5,10][i]+' verified unlocked achievement'+(i?'s':'')+'</p><span class="tag">'+(owned?'✓ Collected':'○ Your next chapter')+'</span></article>'}).join('')+'</div><p class="small muted" style="margin-top:24px">City clothes use original colour palettes and generic local details, not football club crests or licensed kits.</p>'}
function cast(adopting=false){
 return (adopting?'<div class="adopt-intro"><p class="eyebrow">TEN FAMILIES. YOUR KIND OF COMPANY.</p><h1>Meet your<br><em>little partner in plans.</em></h1><p class="subtitle">Pick a personality. Give them a name. Make the rest up together.<br>Every family can wear every outfit.</p></div>':heading('MEET THE AKIPALS','Find your kind of character.','Ten personalities. Ten signature collections. Your wardrobe works with every one.'))+'<div class="toolbar" style="justify-content:center"><button class="chip '+(!showMasters?'active':'')+'" data-act="cast-mode" data-mode="base" aria-pressed="'+(!showMasters)+'">Meet the families</button><button class="chip '+(showMasters?'active':'')+'" data-act="cast-mode" data-mode="master" aria-pressed="'+showMasters+'">Signature art previews</button></div>'+(showMasters?'<p class="cast-preview-note">These are collectable style previews. Pick up each piece separately through play.</p>':'')+'<div class="cast-grid">'+data.catalog.families.map(f=>{
 const chosen=(adopting?selectedFamily:data.state.family)===f.id;
 return '<article class="cast-card '+(chosen?'selected':'')+'" style="--family-accent:'+esc(f.style?.accent||'#b1cebc')+'">'+(showMasters?(f.signatureSvg||f.masterSvg):f.baseSvg)+'<h3>'+esc(f.name)+'</h3><small>'+esc(f.category)+'</small><p class="family-title">'+esc(f.style?.title||'')+'</p><p class="family-description">'+esc(f.style?.description||f.personality)+'</p>'+btn(chosen?'Your choice ✓':adopting?'Choose '+esc(f.name):'Try this family','family','data-id="'+f.id+'" aria-pressed="'+chosen+'"',chosen?'soft':'')+(adopting?'':btn('Explore this style ↗','collection','data-id="'+f.id+'"','link'))+'</article>';
 }).join('')+'</div>'+(adopting?'<form id="adopt-form" class="adopt-bottom"><div style="flex:1;min-width:140px"><label class="field-label" for="pal-name">A name for your new '+esc(family().name)+'</label><input id="pal-name" class="input" name="name" placeholder="Your little legend’s name" maxlength="24" required autocomplete="off" value="'+esc($('#pal-name')?.value||'')+'"></div><button class="btn primary" type="submit">Meet my Pal ↗</button></form>':'<div class="notice" style="margin-top:22px">Switching family is free and keeps your name, wardrobe and progress. Signature collections use existing collectable pieces; previewing a look does not grant its items. Every family starts with the same gameplay potential.</div>');
}
function settings(){
 return heading('YOUR LITTLE WORLD','Just the way you like it.','A few preferences. Your progress, safely with you.')+'<div class="settings-grid"><section class="panel"><h2>Take your Pal with you</h2><p>Use your equipped Pal as your own location marker on the AkiPasa map. Your location stays private.</p><div class="toggle-row"><label for="map-setting">Use my map companion</label><input id="map-setting" type="checkbox" '+(data.state.mapEnabled?'checked':'')+'></div><a class="btn soft" href="/en/map" rel="nofollow">Open my AkiPasa map ↗</a><p>Switch this off whenever you want the blue dot back. Location accuracy is always kept.</p></section><section class="panel"><h2>Yours, on every device</h2><p>Your Pal, wardrobe and progress are saved to your signed-in account. Use the same account to pick up on another device.</p><div class="dialog-actions">'+btn('Rename my Pal','rename')+btn('Download save snapshot','export')+'</div><p>The download is a copy for your records. Importing edited saves is not supported.</p></section><section class="panel"><h2>A reason to drop by</h2><p>Share a snack, change a look, and finish a story or game for your daily bonus. Complete three different stories for a weekly extra.</p><p>Finished bonuses wait until you collect them. You never lose bond XP for taking a break.</p><details class="settings-details"><summary>Parcels &amp; reward details</summary><p>One free parcel arrives at 00:00 UTC each day; up to three accumulate. Every parcel gives 40 Threads, 15 Scrap, one module and equipment.</p><p>Parcel designs are equally likely. Socket counts: 51% one, 34% two, 15% three. The three module types are equally likely. Daily goals reset at 00:00 UTC; weekly stories reset Monday at 00:00 UTC.</p><p>All Threads are earned in-game. No real-money purchases, paid rerolls or purchased random rewards are enabled.</p></details></section><section class="panel"><h2>A little world in the making</h2><p>English-language private playtest · 0.3</p><p>Ten families, signature collections, ten stories and an arcade. Keep your favourite look as you explore what comes next.</p><p>This preview is for invited accounts and administrators. Your collection is not publicly shared.</p>'+btn('Meet the families ↗','tab','data-tab-target="cast"','soft')+'</section></div>';
}
function render(){
 if(!data)return;
 const x=window.scrollX,y=window.scrollY; nav();
 if(!data.state.family){main.innerHTML='<div class="adoption">'+cast(true)+'</div>';return}
 main.innerHTML=({home,wardrobe,workshop,adventures,arcade,shop,keepsakes,cast,settings}[tab]||home)();
 window.scrollTo(x,y);if(modal)renderModal();if(busy)setBusy(true);
}
function focusEquivalent(element,scope=document){
 if(!element)return false;
 let selector=element.id?'#'+CSS.escape(element.id):'';
 if(!selector){
  const attributes=['data-act','data-id','data-slot','data-index','data-period','data-activity','data-tab','data-game','data-direction'].filter(name=>element.hasAttribute(name));
  if(attributes.length)selector=element.tagName.toLowerCase()+attributes.map(name=>'['+name+'="'+CSS.escape(element.getAttribute(name))+'"]').join('');
  else{const form=element.closest('form[id]');if(form&&element.matches('button[type="submit"]'))selector='#'+CSS.escape(form.id)+' button[type="submit"]'}
 }
 const candidates=element.isConnected&&scope.contains(element)?[element]:selector?[...scope.querySelectorAll(selector)]:[];
 const target=candidates.find(candidate=>!candidate.disabled&&candidate.getClientRects().length);
 if(!target)return false;target.focus({preventScroll:true});return document.activeElement===target;
}
function openModal(value){if(!dialog.open)lastFocus=document.activeElement;modal=value;if(value?.type==='item'){const item=eq(value.id);if(item)track('item_viewed',{itemId:item.appearance,collectionId:collectionOf(item.appearance)})}renderModal();if(!dialog.open)dialog.showModal()}
function closeModal(){const wasOpen=dialog.open;modal=null;dialog.close();if(wasOpen&&!focusEquivalent(lastFocus))$('#page-title')?.focus({preventScroll:true});lastFocus=null}
function renderModal(){
 if(!modal)return;
 let title='',body='';
 if(modal.type==='item'){
  const item=eq(modal.id);if(!item){closeModal();return}const d=design(item.design),look=design(item.appearance),isEquipped=equipped(item);
  title=look.name;const spares=data.state.equipment.filter(i=>i.design===item.design&&i.id!==item.id&&!equipped(i));
  body='<div class="detail-art">'+look.svg+'</div><div class="detail-summary"><span>Level '+item.level+' / 10</span><span>'+item.sockets.length+' / 3 sockets</span><span>'+labels[d.stat]+' +'+Math.floor(item.level/2)+'</span></div><div class="dialog-actions">'+btn(isEquipped?'Unequip':'Equip this piece',isEquipped?'unequip':'equip',isEquipped?'data-slot="'+d.slot+'"':'data-id="'+item.id+'"','primary')+btn(item.level>=10?'Max level':'Upgrade · '+15*item.level+' Scrap','upgrade','data-id="'+item.id+'" '+(item.level>=10||data.state.scrap<15*item.level?'disabled':''))+'</div><div class="socket-label">Useful little modules · '+data.derived.activeModules+' / 6 active</div><div class="socket-grid">'+item.sockets.map((stat,index)=>'<div class="socket-line"><label for="socket-'+index+'">Socket '+(index+1)+'</label><select class="input" id="socket-'+index+'" data-module-item="'+item.id+'" data-index="'+index+'"><option value="" '+(stat===null?'selected':'')+'>Empty</option>'+['wits','energy','charm'].map(k=>'<option value="'+k+'" '+(k===stat?'selected':'')+' '+(data.state.modules[k]===0&&k!==stat?'disabled':'')+'>'+labels[k]+' +2 · '+data.state.modules[k]+' spare</option>').join('')+'</select></div>').join('')+'</div>'+(item.sockets.length<3?btn('Open socket · '+30*item.sockets.length+' Scrap','socket','data-id="'+item.id+'" '+(data.state.scrap<30*item.sockets.length?'disabled':''),'wide'):'')+'<div class="socket-label">Wear any collected appearance</div><select class="input" id="appearance" data-appearance-item="'+item.id+'" aria-label="Appearance">'+data.state.wardrobe.filter(id=>design(id).slot===d.slot).map(id=>'<option value="'+id+'" '+(id===item.appearance?'selected':'')+'>'+esc(design(id).name)+'</option>').join('')+'</select><p class="detail-info">Equipment: '+esc(d.name)+'. Changing its look never changes its stats. Unused modules on unequipped items do not count towards the six-module active limit.</p><div class="dialog-actions">'+btn('Scrap for '+(8+4*item.level+3*(item.sockets.length-1)),'ask-scrap','data-id="'+item.id+'" '+(isEquipped?'disabled title="Unequip before scrapping"':''),'danger')+(spares.length?btn('Merge a duplicate','ask-merge','data-id="'+item.id+'" data-spare="'+spares[0].id+'"'):'')+'</div>';
 }else if(modal.type==='rename'){
  title='A name for your little legend';body='<form id="rename-form"><label class="field-label" for="new-name">Pal name</label><input class="input" id="new-name" name="name" value="'+esc(data.state.name)+'" maxlength="24" required autocomplete="off"><div class="dialog-actions"><button class="btn primary" type="submit">Save name</button></div></form>';
 }else if(modal.type==='reward'){
  title='Something found you';const report=data.state.report;body='<div class="reward-summary">'+(report.design?'<div class="reward-art">'+design(report.design).svg+'</div>':'')+'<p class="eyebrow">A LITTLE DISCOVERY</p><h3>'+esc(report.title)+'</h3><p>'+esc(report.text)+'</p><div class="dialog-actions">'+btn('Into my wardrobe','reward-wardrobe','','primary')+btn('Lovely, thanks','close')+'</div></div>';
 }else if(modal.type==='confirm'){
  title=modal.title;body='<p class="small muted">'+esc(modal.text)+'</p><div class="dialog-actions">'+btn('Keep it as it is','cancel-confirm')+btn(modal.label,'confirm','','primary')+'</div>';
 }else if(modal.type==='more'){
  title='A little more to explore';body=pages.filter(([id])=>!['home','wardrobe','adventures','arcade'].includes(id)).map(([id,label])=>navButton(id,label)).join('');
 }
 dialog.innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+esc(title)+'</h2><button class="icon-button" data-act="close" aria-label="Close dialog">×</button></div><div class="dialog-body">'+body+'</div>';
}
function toast(title,text,error=false,persistent=false){clearTimeout(toastTimer);const el=$('#toast');el.innerHTML='<strong>'+esc(title)+'</strong>'+esc(text)+(retryCommand?'<div>'+btn('Retry safely','retry')+'</div>':'');el.className='toast show'+(error?' error':'');if(!persistent)toastTimer=setTimeout(()=>el.classList.remove('show'),6500)}
function setBusy(value){busy=value;document.body.classList.toggle('busy',value);main.setAttribute('aria-busy',String(value));document.querySelectorAll('button:not([data-act="close"]),select,input').forEach(el=>{if(value){if(!el.disabled){el.dataset.busyDisabled='true';el.disabled=true}}else if(el.dataset.busyDisabled){delete el.dataset.busyDisabled;el.disabled=false}});if(data)savedStatus()}
function accept(response){data={...data,...response,offset:response.serverNow-Date.now()};try{if(data.state.mapEnabled)sessionStorage.setItem('akipals-map-preview','1');else sessionStorage.removeItem('akipals-map-preview')}catch{}render()}
async function command(action,retry=null){
 if(busy)return false;
 if(retryCommand&&!retry){toast('Finish the pending request first','Use Retry safely below. This protects you from receiving or spending anything twice.',true,true);return false}
 const focusBeforeSave=document.activeElement,wasModal=dialog.open;
 const payload=retry||{id:crypto.randomUUID(),version:data.version,action};retryCommand=payload;setBusy(true);
 let committed=false;
 try{
  const response=await fetch('/pals/api',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const body=await response.json();
  if(!response.ok){if(body.state)accept(body);if(response.status>=500){retryCommand=payload;throw new Error('The server could not confirm this save. Retry the same request safely.')}retryCommand=null;throw new Error(body.error||'This action could not be completed.')}
  retryCommand=null;accept(body);committed=true;
  toast(data.state.report.title,data.state.report.text);
  if(action.type==='parcel')openModal({type:'reward'});
  if(action.type==='adopt'){$('#page-title')?.focus();window.scrollTo(0,0)}
 }catch(error){
  if(error instanceof TypeError)retryCommand=payload;
  toast('Nothing to guess at',error.message||'Connection interrupted. Retry the same request safely.',true,Boolean(retryCommand));
 }finally{setBusy(false);if(wasModal&&dialog.open&&!dialog.contains(document.activeElement)&&!focusEquivalent(focusBeforeSave,dialog))dialog.querySelector('button:not(:disabled),input:not(:disabled),select:not(:disabled)')?.focus({preventScroll:true})}
 return committed;
}
${PALS_ARCADE_CLIENT}

function go(target){if(!data||!data.state.family)return;if(target==='more'){openModal({type:'more'});return}if(!pages.some(([id])=>id===target))return;if(target==='shop')track('collection_viewed',{collectionId:'akipasa-originals'});if(target==='keepsakes')track('collection_viewed',{collectionId:'city-keepsakes'});closeModal();tab=target;filter='all';search='';styleFilter='all';render();window.scrollTo(0,0);$('#page-title')?.focus()}
document.addEventListener('click',async event=>{
 const target=event.target.closest('[data-act],[data-tab]');if(!target||target.disabled)return;
 if(target.dataset.tab){go(target.dataset.tab);return}
 const act=target.dataset.act,id=target.dataset.id;
 if(act==='theme'){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');return}
 if(act==='close'){closeModal();return}
 if(act==='retry'){if(retryCommand)await command(retryCommand.action,retryCommand);return}
 if(act==='load'){boot();return}
 if(!data)return;
 if(await handleArcadeAction(act,target))return;
 switch(act){
 case 'tab':go(target.dataset.tabTarget);break;
 case 'filter':filter=target.dataset.slot;render();break;
 case 'reset-filters':filter='all';search='';styleFilter='all';render();$('#piece-search')?.focus();break;
 case 'collection':go('shop');styleFilter=id;render();break;
 case 'care-focus':$('.care-row button')?.focus();$('.care-row')?.scrollIntoView({block:'center'});break;
 case 'care':if(await command({type:'care',activity:target.dataset.activity}))animateHello(target.dataset.activity==='rest'?'☾':target.dataset.activity==='snack'?'◒':'♡');break;
 case 'journey-claim':await command({type:'journey-claim',period:target.dataset.period});break;
 case 'slot':go('wardrobe');filter=target.dataset.slot;render();break;
 case 'boop':animateHello();break;
 case 'inspect':openModal({type:'item',id});break;
 case 'rename':openModal({type:'rename'});break;
 case 'equip':case 'upgrade':case 'socket':await command({type:act,itemId:id});break;
 case 'unequip':await command({type:'unequip',slot:target.dataset.slot});break;
 case 'parcel':await command({type:'parcel'});break;
 case 'family':if(!data.state.family){selectedFamily=id;render()}else{await command({type:'family',family:id})}break;
 case 'cast-mode':showMasters=target.dataset.mode==='master';render();break;
 case 'buy':{const d=design(id);openModal({type:'confirm',title:'A new favourite?',text:d.name+' costs '+d.price+' earned Threads. No real money is charged. You receive one level-1 copy with one socket, and keep its appearance forever.',label:'Collect for '+d.price+' Threads',action:{type:'buy',sku:id}});break}
 case 'goal':await command({type:'goal',sku:data.state.goal===id?null:id});break;
 case 'start':await command({type:'start',adventure:id});break;
 case 'choice':await command({type:'choice',index:Number(target.dataset.index)});break;
 case 'leave':if(data.state.run.step<3){openModal({type:'confirm',title:'Leave this little story?',text:'This unfinished run will end without rewards. Your equipment and collection stay safe.',label:'Leave adventure',action:{type:'leave'}})}else{await command({type:'leave'})}break;
 case 'finish':if(await command({type:'leave'}))go('home');break;
 case 'claim':await command({type:'claim'});break;
 case 'reward-wardrobe':go('wardrobe');break;
 case 'ask-scrap':{const item=eq(id);openModal({type:'confirm',title:'Recycle this equipment copy?',text:design(item.design).name+' will be consumed. Its collected appearance stays forever and all fitted modules return to your supply.',label:'Scrap this copy',action:{type:'scrap',itemId:id},back:id});break}
 case 'ask-merge':{const item=eq(id),spare=eq(target.dataset.spare);openModal({type:'confirm',title:'Keep the best of both?',text:'Combine level '+item.level+' / '+item.sockets.length+' sockets with level '+spare.level+' / '+spare.sockets.length+' sockets. Keep level '+Math.max(item.level,spare.level)+' and '+Math.max(item.sockets.length,spare.sockets.length)+' sockets. The spare is consumed; its modules are returned.',label:'Merge these copies',action:{type:'merge',itemId:id,duplicateId:spare.id},back:id});break}
 case 'confirm':{const action=modal.action,back=modal.back;closeModal();const ok=await command(action);if(ok&&back&&eq(back))openModal({type:'item',id:back});break}
 case 'cancel-confirm':{const back=modal.back;if(back)openModal({type:'item',id:back});else closeModal();break}
 case 'export':{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),previewVersion:'0.3',state:data.state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='akipals-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break}
 }
});
document.addEventListener('submit',async event=>{if(!['adopt-form','rename-form'].includes(event.target.id))return;event.preventDefault();const name=String(new FormData(event.target).get('name')||'');if(event.target.id==='adopt-form')await command({type:'adopt',family:selectedFamily,name});else{if(await command({type:'rename',name}))closeModal()}});
document.addEventListener('input',event=>{if(event.target.id!=='piece-search')return;const el=event.target,position=el.selectionStart;search=el.value;render();const field=$('#piece-search');field?.focus();try{field?.setSelectionRange(position,position)}catch{}});
document.addEventListener('change',async event=>{const el=event.target;if(el.id==='collection-filter'){styleFilter=el.value;render();$('#collection-filter')?.focus();return}if(el.dataset.moduleItem)await command({type:'module',itemId:el.dataset.moduleItem,index:Number(el.dataset.index),stat:el.value||null});if(el.dataset.appearanceItem)await command({type:'appearance',itemId:el.dataset.appearanceItem,appearance:el.value});if(el.id==='map-setting'){await command({type:'map',enabled:el.checked});el.checked=data.state.mapEnabled}});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeModal()});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal()}});
window.addEventListener('online',()=>{if(data)nav()});window.addEventListener('offline',()=>{if(data)nav()});
async function refreshTimeBoundary(){
 if(!data||busy||retryCommand||refreshingTime||!navigator.onLine||document.hidden)return;
 const next=data.derived.journey?.nextDailyAt;if(!next||Date.now()+data.offset<next)return;
 refreshingTime=true;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch('/pals/api',{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(!response.ok)return;const body=await response.json();if(data&&!busy&&!retryCommand&&body.version>=data.version)accept(body)}catch{}finally{clearTimeout(timeout);refreshingTime=false}
}
setInterval(()=>{if(data&&!busy&&tab==='home'&&!modal&&data.state.family){const count=availableNow();if(count!==data.derived.parcels){data.derived.parcels=count;render()}refreshTimeBoundary()}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&tab==='home')refreshTimeBoundary()});
function animateHello(symbol='♡'){
 const art=$('.pal-art'),stageEl=$('.stage');if(!art||!stageEl)return;
 art.classList.remove('boop');void art.offsetWidth;art.classList.add('boop');
 const star=document.createElement('span');star.className='spark';star.textContent=symbol;star.setAttribute('aria-hidden','true');stageEl.appendChild(star);
 setTimeout(()=>{star.remove();art.classList.remove('boop')},900);
}
async function boot(){
 main.innerHTML='<div class="loading"><div><div class="orb" aria-hidden="true">✧</div><h2>Finding your little world…</h2><p class="small muted">Loading your account-saved collection.</p></div></div>';
 try{const response=await fetch('/pals/api',{credentials:'same-origin',cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'Your preview could not be loaded.');data=body;data.offset=body.serverNow-Date.now();accept(body)}catch(error){main.innerHTML='<div class="empty"><h1>One small interruption.</h1><p>'+esc(error.message)+'</p>'+btn('Try loading again','load','','primary')+'<p><a href="/en/auth?next=%2Fpals" rel="nofollow">Sign in to your team account</a></p></div>'}
}
boot();
})();
`;
