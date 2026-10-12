/** Injected into the private preview's existing closure; gameplay taps never make network requests. */
export const PALS_ARCADE_CLIENT = String.raw`
let arcadeLocal=null,arcadeLobby=false;
const arcadeStorageKey='akipals-arcade-run';
const arcadeFaces=['moka','brasa','brote','lux','nube','rayo'];
function arcadeMemoryState(run,moves){
 const matched=new Set();let valid=moves.length%2===0;
 for(let turn=0;valid&&turn<moves.length;turn+=2){
  const first=moves[turn],second=moves[turn+1];
  if(first<0||first>11||second<0||second>11||first===second||matched.has(first)||matched.has(second)||matched.size===12){valid=false;break}
  if(run.board[first]===run.board[second]){matched.add(first);matched.add(second)}
 }
 return {matched,valid,complete:valid&&matched.size===12};
}
function arcadeNeighbours(cell,size){
 const row=Math.floor(cell/size),col=cell%size;
 return [row>0?cell-size:-1,row<size-1?cell+size:-1,col>0?cell-1:-1,col<size-1?cell+1:-1].filter(index=>index>=0);
}
function arcadeTrailState(run,moves){
 let position=run.start,valid=true;const stars=new Set(),visited=new Set([run.start]);
 for(const cell of moves){
  if(run.blocked.includes(cell)||!arcadeNeighbours(position,run.size).includes(cell)||(position===run.goal&&stars.size===3)){valid=false;break}
  position=cell;visited.add(cell);if(run.stars.includes(cell))stars.add(cell);
 }
 return {position,stars,visited,valid,complete:valid&&position===run.goal&&stars.size===3};
}
function arcadeRemember(){try{sessionStorage.setItem(arcadeStorageKey,JSON.stringify({id:arcadeLocal.id,moves:arcadeLocal.moves,first:arcadeLocal.first}))}catch{}}
function arcadeHydrate(run){
 if(arcadeLocal?.id===run.id)return arcadeLocal;
 arcadeLocal={id:run.id,moves:[],first:null,notice:''};
 try{
  const saved=JSON.parse(sessionStorage.getItem(arcadeStorageKey)||'null');
  if(saved?.id===run.id&&Array.isArray(saved.moves)&&saved.moves.length<=data.derived.arcade.maxMoves&&saved.moves.every(move=>Number.isInteger(move)&&move>=0&&move<=24)){
   const progress=run.game==='memory'?arcadeMemoryState(run,saved.moves):arcadeTrailState(run,saved.moves);
   if(progress.valid){
    arcadeLocal.moves=saved.moves;
    if(run.game==='memory'&&Number.isInteger(saved.first)&&saved.first>=0&&saved.first<=11&&!progress.matched.has(saved.first))arcadeLocal.first=saved.first;
   }
  }
 }catch{}
 return arcadeLocal;
}
function arcadeFace(value){return data.catalog.families.find(f=>f.id===arcadeFaces[value])||data.catalog.families[value]}
function arcadeSvg(svg,prefix){return svg.replace(/\bid="([^"]+)"/g,(_,id)=>'id="'+prefix+'-'+id+'"').replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+prefix+'-'+id+')')}
function arcadeCardArt(game){
 if(game==='memory')return '<div class="arcade-card-art arcade-card-art--memory" aria-hidden="true">'+[0,1,2,1,0,2].map((face,index)=>'<span class="arcade-preview-card '+(index===1||index===4?'arcade-preview-card--back':'')+'">'+(index===1||index===4?'✦':arcadeSvg(arcadeFace(face).baseSvg,'arcade-preview-'+index))+'</span>').join('')+'</div>';
 return '<div class="arcade-card-art arcade-card-art--trail" aria-hidden="true"><div class="arcade-preview-trail">'+Array.from({length:25},(_,index)=>'<span class="'+([2,7,11,13,18].includes(index)?'rock':[0,1,6,5,10,15,20,21,22,23,24].includes(index)?'route':'')+'">'+(index===0?'●':[5,15,22].includes(index)?'✦':index===24?'⚑':'')+'</span>').join('')+'</div></div>';
}
function arcadeResult(){
 const result=data.derived.arcade.lastResult;if(!result)return '';
 const game=data.derived.arcade.games.find(entry=>entry.id===result.game),reward=game.reward;
 return '<section class="panel arcade-result" aria-label="Last saved arcade result"><div class="arcade-result-mark" aria-hidden="true">'+(result.personalBest?'✦':'✓')+'</div><div class="arcade-result-copy"><p class="card-label">'+esc(game.name)+' · RESULT SAVED</p><h2>'+(result.personalBest?'A new personal best.':'A lovely little win.')+'</h2><p>'+result.moves+' '+(result.game==='memory'?'turns':'steps')+' · '+(result.rewarded?'+'+reward.threads+' Threads, +'+reward.scrap+' Scrap, +'+reward.xp+' bond XP.':'Free practice. Today’s reward is already collected.')+'</p></div><div class="arcade-result-score"><strong>'+result.score+'</strong><span>points</span></div></section>';
}
function arcade(){
 const summary=data.derived.arcade,active=summary.active;
 if(active&&!arcadeLobby)return arcadeGame(active);
 return heading('A LITTLE PLAY GOES A LONG WAY','Small games. <em>Good company.</em>','Two pocket-sized puzzles. No timer, no pressure. Just you and your Pal.')+arcadeResult()+(active?'<div class="arcade-resume"><span><strong>Your '+(active.game==='memory'?'Memory Mix':'Trail Finder')+' puzzle is waiting.</strong> Continue whenever you’re ready.</span>'+btn('Resume puzzle ↗','arcade-resume','','primary')+'</div>':'')+'<div class="arcade-picker">'+summary.games.map(game=>'<article class="panel arcade-choice">'+arcadeCardArt(game.id)+'<div class="arcade-choice-body"><p class="card-label">'+esc(game.skill)+'</p><h2>'+esc(game.name)+'</h2><p>'+esc(game.description)+'</p><div class="arcade-reward-pill '+(game.dailyAvailable?'':'collected')+'">'+(game.dailyAvailable?'◇ '+game.reward.threads+' Threads · +'+game.reward.scrap+' Scrap · +'+game.reward.xp+' XP':'✓ Today’s reward collected · free practice')+'</div><div class="arcade-choice-footer"><div class="arcade-personal-best"><small>PERSONAL BEST</small><strong>'+(game.plays?game.bestScore+' <span>pts</span>':'Your first score awaits')+'</strong></div>'+btn(active&&active.game===game.id?'New puzzle ↗':game.plays?'Play again ↗':'Let’s play ↗','arcade-start','data-game="'+game.id+'"','primary')+'</div></div></article>').join('')+'</div><p class="arcade-footnote">One reward per game each day, refreshed at 00:00 UTC. Every completed game counts towards Today, together. Free practice is always open.</p>';
}
function arcadeGame(run){
 const local=arcadeHydrate(run),game=data.derived.arcade.games.find(entry=>entry.id===run.game),memory=run.game==='memory',progress=memory?arcadeMemoryState(run,local.moves):arcadeTrailState(run,local.moves),full=local.moves.length>=data.derived.arcade.maxMoves;
 const complete=progress.complete;
 const status=complete?'All '+(memory?'six pairs found.':'three stars found. You reached the flag.')+' Save your result to collect your reward.':local.notice||(memory?'Reveal two cards. Matching Pals stay face up.':'Collect all three stars, then reach the flag. Move one tile at a time.');
 const hud='<div class="arcade-hud"><div><span>'+(memory?'PAIRS FOUND':'STARS FOUND')+'</span><strong>'+(memory?progress.matched.size/2:progress.stars.size)+'<small> / '+(memory?6:3)+'</small></strong></div><div><span>'+(memory?'TURNS':'ROUTE STEPS')+'</span><strong>'+(memory?local.moves.length/2:local.moves.length)+'</strong></div><div><span>'+(memory?'PERSONAL BEST':'SHORTEST ROUTE')+'</span><strong>'+(memory?(game.plays?game.bestScore:'—'):run.par)+'<small>'+(memory&&game.plays?' pts':memory?'':' steps')+'</small></strong></div></div>';
 let board='';
 if(memory){
  const lastPair=local.first===null?local.moves.slice(-2):[];
  board='<div id="arcade-board" class="arcade-memory-board" role="group" aria-label="Memory Mix cards. Use Tab or arrow keys, then Enter or Space to reveal.">'+run.board.map((value,index)=>{
   const matched=progress.matched.has(index),revealed=matched||local.first===index||lastPair.includes(index),face=arcadeFace(value);
   return '<button class="arcade-memory-tile '+(revealed?'revealed ':'')+(matched?'matched':'')+'" data-act="arcade-flip" data-index="'+index+'" '+(matched||complete||full?'disabled ':'')+'aria-label="Card '+(index+1)+(revealed?': '+esc(face.name)+(matched?', matched':', revealed'):', face down')+'" aria-pressed="'+revealed+'"><span class="arcade-memory-back" aria-hidden="true">✦<small>AKIPALS</small></span><span class="arcade-memory-face" aria-hidden="true">'+arcadeSvg(face.baseSvg,'arcade-memory-'+index)+'<strong>'+esc(face.name)+'</strong>'+(matched?'<i>✓</i>':'')+'</span></button>';
  }).join('')+'</div>';
 }else{
  const available=arcadeNeighbours(progress.position,run.size),pal=data.catalog.families.find(f=>f.id===data.state.family);
  board='<div id="arcade-board" class="arcade-trail-board" tabindex="0" role="group" aria-label="Trail Finder board. Use arrow keys to move your Pal. Collect three stars then reach the flag.">'+Array.from({length:25},(_,index)=>{
   const rock=run.blocked.includes(index),current=index===progress.position,star=run.stars.includes(index),collected=progress.stars.has(index),goal=index===run.goal,start=index===run.start,adjacent=available.includes(index)&&!rock;
   const label='Row '+(Math.floor(index/5)+1)+', column '+(index%5+1)+': '+(rock?'rock':current?'your Pal':goal?'finish flag':star?'star'+(collected?', collected':''):start?'start':'path');
   return '<button class="arcade-trail-tile '+(rock?'rock ':'')+(current?'current ':'')+(progress.visited.has(index)?'visited ':'')+(adjacent&&!complete?'adjacent ':'')+(goal?'goal':'')+'" data-act="arcade-step" data-index="'+index+'" tabindex="-1" '+(rock||complete||full?'disabled ':'')+'aria-label="'+label+'">'+(current?'<span class="arcade-trail-pal" aria-hidden="true">'+arcadeSvg(pal.baseSvg,'arcade-trail-pal')+'</span>':rock?'<span aria-hidden="true">▨</span>':star?'<span class="arcade-trail-star '+(collected?'collected':'')+'" aria-hidden="true">'+(collected?'✓':'✦')+'</span>':goal?'<span class="arcade-trail-flag" aria-hidden="true">⚑</span>':start?'<span class="arcade-trail-start" aria-hidden="true">S</span>':progress.visited.has(index)?'<span class="arcade-trail-dot" aria-hidden="true"></span>':'')+(current&&goal?'<span class="arcade-tile-badge" aria-hidden="true">⚑</span>':'')+'</button>';
  }).join('')+'</div>';
 }
 const directions=memory?'':'<div class="arcade-directions" role="group" aria-label="Move your Pal">'+[['up','↑','Move up'],['left','←','Move left'],['down','↓','Move down'],['right','→','Move right']].map(([direction,arrow,label])=>'<button class="btn arcade-direction arcade-direction--'+direction+'" data-act="arcade-direction" data-direction="'+direction+'" aria-label="'+label+'" '+(complete||full?'disabled':'')+'>'+arrow+'</button>').join('')+'</div>';
 return heading('THE ARCADE',esc(game.name),memory?'A few familiar faces. Can you find their other halves?':'Three little discoveries. One good route home.',btn('← All games','arcade-back'))+'<div class="arcade-layout"><section class="panel arcade-play-panel">'+hud+board+'<p class="arcade-game-status" role="status" aria-live="polite">'+esc(full&&!complete?'That’s a lot of exploring. Reset this board or start a new free puzzle.':status)+'</p>'+directions+'<div class="arcade-play-actions">'+(memory?'':btn('Undo step','arcade-undo',local.moves.length?'':'disabled'))+btn('Reset board','arcade-reset',local.moves.length||local.first!==null?'':'disabled')+btn('Save result ↗','arcade-finish',complete?'':'disabled','primary')+'</div></section><aside class="arcade-side"><section class="panel arcade-howto"><p class="card-label">YOUR LITTLE MISSION</p><h2>'+(memory?'Find your people.':'Make a little detour.')+'</h2><ol>'+(memory?'<li>Reveal two cards.</li><li>Matching Pals stay together.</li><li>Find all six pairs, then save.</li>':'<li>Tap a neighbouring tile or use the arrows.</li><li>Collect all three stars.</li><li>Reach the flag, then save.</li>')+'</ol><div class="arcade-input-tip">'+(memory?'Keyboard: Tab or arrows to move between cards. Enter or Space to reveal.':'Keyboard: focus the board and use the arrow keys. Undo lets you plan a better route.')+'</div></section><section class="panel arcade-prize"><p class="card-label">'+(game.dailyAvailable?'TODAY’S LITTLE REWARD':'FREE PRACTICE')+'</p><h2>'+(game.dailyAvailable?'◇ '+game.reward.threads+' Threads':'Play for the joy of it.')+'</h2><p>'+(game.dailyAvailable?'Plus '+game.reward.scrap+' Scrap and '+game.reward.xp+' bond XP. Any completed puzzle earns the same reward.':'Today’s reward for this game is safely collected. You can still set a new personal best.')+'</p><p class="small muted">'+(memory?'Fewer turns earn a higher score.':'Fewer steps earn a higher score. Undo and reset are part of planning.')+' Your score is personal; rewards stay the same.</p></section><div class="arcade-session-note">Moves stay in this browser tab, including after a refresh. Only a saved result earns rewards.</div>'+btn('Try a new puzzle','arcade-start','data-game="'+run.game+'"','wide')+'</aside></div>';
}
function arcadeRefresh(focus){
 arcadeRemember();render();
 if(focus)document.querySelector(focus)?.focus({preventScroll:true});
}
function arcadeFocusBoard(){
 const board=document.getElementById('arcade-board');if(!board)return;
 const target=board.classList.contains('arcade-memory-board')?(board.querySelector('button:not(:disabled)')||document.querySelector('[data-act="arcade-finish"]')):board;
 target?.focus({preventScroll:true});
}
async function handleArcadeAction(act,target){
 if(!act?.startsWith('arcade-'))return false;
 if(document.body.classList.contains('busy'))return true;
 if(act==='arcade-back'){arcadeLobby=true;render();document.getElementById('page-title')?.focus();return true}
 if(act==='arcade-resume'){arcadeLobby=false;render();arcadeFocusBoard();return true}
 if(act==='arcade-start'){
  const game=target.dataset.game;if(!['memory','trail'].includes(game))return true;
  arcadeLobby=false;if(await command({type:'arcade-start',game}))arcadeFocusBoard();return true;
 }
 const run=data.derived.arcade.active;if(!run)return true;const local=arcadeHydrate(run),memory=run.game==='memory';
 let progress=memory?arcadeMemoryState(run,local.moves):arcadeTrailState(run,local.moves);
 if(act==='arcade-reset'){local.moves=[];local.first=null;local.notice='Fresh start. Same puzzle, all the time you need.';arcadeRefresh(memory?'[data-act="arcade-flip"][data-index="0"]':'#arcade-board');return true}
 if(act==='arcade-undo'&&!memory){local.moves.pop();local.notice='One step back. A better plan starts here.';arcadeRefresh('#arcade-board');return true}
 if(act==='arcade-finish'){
  if(!progress.complete)return true;
  if(await command({type:'arcade-finish',runId:run.id,moves:[...local.moves]})){arcadeLocal=null;try{sessionStorage.removeItem(arcadeStorageKey)}catch{}document.getElementById('page-title')?.focus({preventScroll:true})}return true;
 }
 if(progress.complete||local.moves.length>=data.derived.arcade.maxMoves)return true;
 if(act==='arcade-flip'&&memory){
  const index=Number(target.dataset.index);if(!Number.isInteger(index)||index<0||index>11||progress.matched.has(index)||local.first===index)return true;
  if(local.first===null){local.first=index;local.notice='Now choose another card.'}
  else{
   const first=local.first;local.moves.push(first,index);local.first=null;
   local.notice=run.board[first]===run.board[index]?'A pair! Those two found their people.':'Not a pair. Pick your next card to turn these back over.';
  }
  progress=arcadeMemoryState(run,local.moves);
  const next=progress.matched.has(index)?run.board.findIndex((_,cell)=>!progress.matched.has(cell)):index;
  arcadeRefresh(progress.complete?'[data-act="arcade-finish"]':'[data-act="arcade-flip"][data-index="'+next+'"]');return true;
 }
 if((act==='arcade-step'||act==='arcade-direction')&&!memory){
  let index=Number(target.dataset.index);
  if(act==='arcade-direction'){
   const direction=target.dataset.direction,position=progress.position;
   index=direction==='up'?position-5:direction==='down'?position+5:direction==='left'?(position%5>0?position-1:-1):direction==='right'?(position%5<4?position+1:-1):-1;
  }
  if(!Number.isInteger(index)||!arcadeNeighbours(progress.position,5).includes(index)||run.blocked.includes(index)){
   local.notice='Stay on the path: choose a neighbouring tile without a rock.';arcadeRefresh('#arcade-board');return true;
  }
  const freshStar=run.stars.includes(index)&&!progress.stars.has(index);local.moves.push(index);
  progress=arcadeTrailState(run,local.moves);
  local.notice=freshStar?'A little discovery! '+progress.stars.size+' of 3 stars collected.':index===run.goal&&progress.stars.size<3?'The flag can wait. There are still '+(3-progress.stars.size)+' stars to find.':'';
  arcadeRefresh(progress.complete?'[data-act="arcade-finish"]':'#arcade-board');return true;
 }
 return false;
}
document.addEventListener('keydown',event=>{
 const board=document.getElementById('arcade-board');
 if(!board||!board.contains(event.target)||dialog.open||document.body.classList.contains('busy'))return;
 const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'},direction=directions[event.key];if(!direction)return;
 const run=data?.derived?.arcade?.active;if(!run)return;event.preventDefault();
 if(run.game==='trail'){handleArcadeAction('arcade-direction',{dataset:{direction}});return}
 const index=Number(event.target.dataset.index);if(!Number.isInteger(index))return;
 const delta={up:-4,down:4,left:-1,right:1}[direction];let next=index+delta;
 while(next>=0&&next<12){
  if((direction==='left'||direction==='right')&&Math.floor(next/4)!==Math.floor(index/4))break;
  const card=board.querySelector('[data-index="'+next+'"]');if(card&&!card.disabled){card.focus({preventScroll:true});break}next+=delta;
 }
});
`;
