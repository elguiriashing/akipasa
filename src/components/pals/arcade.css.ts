/** Scoped arcade layout uses the preview's shared dark/light colour tokens. */
export const PALS_ARCADE_CSS = String.raw`
.arcade-picker { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; }
.arcade-choice { padding:0; overflow:hidden; }
.arcade-card-art { height:210px; display:flex; align-items:center; justify-content:center; border-bottom:1px solid var(--line); background:var(--mint-wash); }
.arcade-card-art--memory { display:grid; grid-template-columns:repeat(3,67px); grid-template-rows:repeat(2,78px); gap:10px; padding:18px; background:radial-gradient(ellipse at 50% 45%,var(--accent-wash),transparent 78%),var(--raised); }
.arcade-preview-card { display:flex; align-items:center; justify-content:center; border:1px solid var(--line); border-radius:13px; background:var(--panel); box-shadow:0 4px 0 #00000012; transform:rotate(-5deg); overflow:hidden; }
.arcade-preview-card:nth-child(even) { transform:rotate(5deg); }
.arcade-preview-card svg { width:66px; height:77px; }
.arcade-preview-card--back { color:var(--orange); font-size:30px; background:var(--accent-wash); }
.arcade-preview-trail { display:grid; grid-template-columns:repeat(5,31px); gap:5px; transform:rotate(-7deg); }
.arcade-preview-trail span { display:grid; place-items:center; height:31px; border:1px solid var(--line); border-radius:7px; background:var(--panel); font-size:19px; color:var(--orange); }
.arcade-preview-trail .rock { background:var(--line); border-color:transparent; }
.arcade-preview-trail .route { background:var(--mint-wash); border-color:var(--mint); }
.arcade-choice-body { padding:24px; }
.arcade-choice h2 { font-size:27px; margin:7px 0 9px; }
.arcade-choice p:not(.card-label) { margin:0; color:var(--muted); font-size:14px; line-height:1.6; }
.arcade-reward-pill { display:inline-flex; flex-wrap:wrap; gap:5px; margin:22px 0; border:1px solid var(--line); padding:9px 12px; border-radius:10px; background:var(--accent-wash); color:var(--text); font-size:12px; line-height:1.4; font-weight:650; }
.arcade-reward-pill.collected { background:var(--mint-wash); color:var(--mint); }
.arcade-choice-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
.arcade-personal-best { display:flex; flex-direction:column; gap:7px; }
.arcade-personal-best small { font-size:9px; font-weight:750; letter-spacing:.12em; color:var(--muted); }
.arcade-personal-best strong { font-size:15px; }
.arcade-personal-best strong span { color:var(--muted); font-size:11px; font-weight:500; }
.arcade-footnote { color:var(--muted); line-height:1.65; font-size:12px; margin:20px 2px; max-width:760px; }
.arcade-resume { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:15px; margin:0 0 20px; padding:16px 20px; border:1px solid var(--line); border-radius:16px; background:var(--raised); font-size:13px; line-height:1.6; }
.arcade-resume strong { display:block; }
.arcade-result { display:flex; align-items:center; gap:20px; margin-bottom:24px; border-color:var(--mint); background:var(--mint-wash); }
.arcade-result-mark { display:grid; place-items:center; width:58px; height:58px; flex:0 0 58px; background:var(--panel); border:1px solid var(--line); border-radius:18px; color:var(--mint); font-size:27px; }
.arcade-result-copy { flex:1; min-width:0; }
.arcade-result h2 { margin:5px 0; font-size:23px; }
.arcade-result p:not(.card-label) { margin:0; color:var(--muted); font-size:13px; line-height:1.6; }
.arcade-result-score { display:flex; flex-direction:column; align-items:center; color:var(--mint); }
.arcade-result-score strong { font-size:36px; letter-spacing:-.04em; line-height:1.1; }
.arcade-result-score span { font-size:12px; color:var(--muted); }
.arcade-layout { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,280px); gap:22px; align-items:start; }
.arcade-play-panel { min-width:0; padding:24px; }
.arcade-hud { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:22px; }
.arcade-hud>div { display:flex; flex-direction:column; gap:7px; padding:0 12px; border-left:1px solid var(--line); min-width:0; }
.arcade-hud>div:first-child { border:0; padding-left:0; }
.arcade-hud span { font-size:9px; font-weight:700; letter-spacing:.08em; color:var(--muted); }
.arcade-hud strong { font-size:27px; font-variant-numeric:tabular-nums; line-height:1.2; }
.arcade-hud small { font-size:12px; color:var(--muted); font-weight:500; white-space:nowrap; }
.arcade-memory-board { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; max-width:560px; margin:auto; }
.arcade-memory-tile { min-width:0; min-height:90px; aspect-ratio:.83; position:relative; border:1px solid var(--line); border-radius:17px; background:var(--raised); padding:0; cursor:pointer; color:var(--orange); touch-action:manipulation; transition:background .15s,border-color .15s; overflow:hidden; }
.arcade-memory-tile:disabled { opacity:1; cursor:default; }
.arcade-memory-tile:hover:not(:disabled) { border-color:var(--orange); background:var(--accent-wash); }
.arcade-memory-back,.arcade-memory-face { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.arcade-memory-back { gap:12px; font-size:29px; }
.arcade-memory-back small { font-size:8px; letter-spacing:.2em; font-weight:750; }
.arcade-memory-face { opacity:0; pointer-events:none; }
.arcade-memory-face svg { height:calc(100% - 22px); width:100%; }
.arcade-memory-face strong { font-size:10px; margin:-4px 0 10px; color:var(--text); }
.arcade-memory-face i { position:absolute; top:6px; right:7px; font-style:normal; font-size:14px; color:var(--mint); }
.arcade-memory-tile.revealed { background:var(--panel); border-color:var(--orange); }
.arcade-memory-tile.revealed .arcade-memory-back { display:none; }
.arcade-memory-tile.revealed .arcade-memory-face { opacity:1; }
.arcade-memory-tile.matched { background:var(--mint-wash); border-color:var(--mint); }
.arcade-game-status { min-height:3.2em; color:var(--muted); font-size:13px; line-height:1.6; margin:18px 0 12px; text-align:center; }
.arcade-play-actions { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:9px; padding-top:12px; border-top:1px solid var(--line); }
.arcade-play-actions .btn { min-height:44px; }
.arcade-side { display:flex; flex-direction:column; gap:16px; min-width:0; }
.arcade-side .panel { padding:22px; }
.arcade-side h2 { margin:8px 0 15px; font-size:20px; line-height:1.3; }
.arcade-howto ol { padding-left:21px; margin:0; font-size:13px; line-height:1.6; color:var(--muted); }
.arcade-howto li { padding-left:4px; margin:0 0 12px; }
.arcade-input-tip { padding-top:15px; border-top:1px solid var(--line); margin-top:16px; font-size:12px; color:var(--muted); line-height:1.7; }
.arcade-prize { background:var(--accent-wash); }
.arcade-prize p:not(.card-label) { font-size:12px; color:var(--muted); line-height:1.7; margin:0 0 8px; }
.arcade-session-note { font-size:11px; color:var(--muted); line-height:1.7; padding:0 4px; }
.arcade-trail-board { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:7px; padding:10px; border:1px solid var(--line); border-radius:20px; background:var(--raised); max-width:440px; margin:auto; outline-offset:5px; }
.arcade-trail-tile { position:relative; min-width:0; min-height:40px; aspect-ratio:1; display:grid; place-items:center; border:1px solid var(--line); border-radius:12px; padding:0; background:var(--panel); color:var(--muted); touch-action:manipulation; }
.arcade-trail-tile:disabled { opacity:1; }
.arcade-trail-tile.rock { background:var(--line); border-color:transparent; font-size:25px; color:var(--muted); }
.arcade-trail-tile.visited { background:var(--mint-wash); }
.arcade-trail-tile.adjacent { cursor:pointer; border-color:var(--mint); }
.arcade-trail-tile.adjacent:hover { background:var(--mint-wash); outline:2px solid var(--mint); }
.arcade-trail-tile.current { outline:2px solid var(--orange); outline-offset:1px; border-color:var(--orange); background:var(--accent-wash); }
.arcade-trail-star { font-size:28px; color:var(--orange); }
.arcade-trail-star.collected { font-size:18px; color:var(--mint); }
.arcade-trail-flag { font-size:32px; color:var(--mint); }
.arcade-trail-start { font-size:12px; font-weight:800; color:var(--mint); }
.arcade-trail-dot { width:6px; height:6px; border-radius:50%; background:var(--mint); opacity:.6; }
.arcade-trail-pal { display:flex; position:absolute; inset:-5px; pointer-events:none; }
.arcade-trail-pal svg { width:100%; height:100%; }
.arcade-tile-badge { position:absolute; right:2px; bottom:0; color:var(--mint); font-size:15px; }
.arcade-directions { display:grid; grid-template-columns:repeat(3,47px); grid-template-rows:repeat(2,44px); justify-content:center; gap:5px; margin:0 auto 18px; }
.arcade-direction { font-size:22px; padding:0; }
.arcade-direction--up { grid-column:2; grid-row:1; }
.arcade-direction--left { grid-column:1; grid-row:2; }
.arcade-direction--down { grid-column:2; grid-row:2; }
.arcade-direction--right { grid-column:3; grid-row:2; }
@media(min-width:1180px) { .arcade-play-panel { padding:28px; } }
@media(max-width:1080px) {
 .arcade-layout { grid-template-columns:minmax(0,1fr); }
 .arcade-side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); align-items:start; }
 .arcade-session-note { align-self:center; }
 .arcade-memory-board { max-width:470px; }
}
@media(max-width:600px) {
 .arcade-picker { grid-template-columns:minmax(0,1fr); gap:18px; }
 .arcade-card-art { height:190px; }
 .arcade-choice-body { padding:20px; }
 .arcade-choice h2 { font-size:25px; }
 .arcade-play-panel { padding:16px; }
 .arcade-hud { gap:7px; margin-bottom:17px; }
 .arcade-hud>div { padding:0 9px; }
 .arcade-hud strong { font-size:24px; }
 .arcade-hud small { font-size:10px; }
 .arcade-hud span { font-size:8px; line-height:1.5; }
 .arcade-memory-board { gap:7px; }
 .arcade-memory-tile { min-height:76px; border-radius:11px; }
 .arcade-memory-back { gap:9px; font-size:23px; }
 .arcade-memory-back small { font-size:6px; letter-spacing:.14em; }
 .arcade-memory-face strong { font-size:8px; margin-bottom:7px; }
 .arcade-memory-face i { top:3px; right:4px; font-size:11px; }
 .arcade-side { display:flex; }
 .arcade-side .panel { padding:20px; }
 .arcade-result { gap:12px; padding:17px; flex-wrap:wrap; }
 .arcade-result-mark { display:none; }
 .arcade-result-copy { flex-basis:calc(100% - 86px); }
 .arcade-result h2 { font-size:19px; }
 .arcade-result-score strong { font-size:29px; }
 .arcade-result p:not(.card-label) { font-size:12px; }
 .arcade-trail-board { gap:5px; padding:7px; border-radius:15px; }
 .arcade-trail-tile { min-height:38px; border-radius:9px; }
 .arcade-trail-star { font-size:24px; }
 .arcade-trail-flag { font-size:26px; }
 .arcade-play-actions { gap:7px; }
 .arcade-play-actions .btn { padding:10px 11px; font-size:12px; }
}
@media(prefers-reduced-motion:reduce) { .arcade-memory-tile { transition:none; } }
`;
