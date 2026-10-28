import { PALS_ARCADE_CSS } from "./arcade.css";

/** The private Pals document owns these tokens; nothing is added to the public shell. */
export const PALS_CSS =
  String.raw`
:root {
  color-scheme: dark;
  --bg: #0b111b;
  --panel: #171f30;
  --raised: #232d44;
  --line: #3c3b51;
  --text: #f3f5fa;
  --muted: #adbbcf;
  --orange: #ffa56b;
  --primary: #ffa56b;
  --on-primary: #222334;
  --mint: #9ed8c0;
  --lilac: #c7b5f1;
  --accent-wash: #ffb57912;
  --mint-wash: #9ed8c010;
  --subtle: #ffffff04;
  --nav-active: #ffb57916;
  --danger: #ffc0c8;
  --danger-wash: #bc526219;
  --shadow: 0 16px 44px #00000024;
  --pal-accent: #b1cebc;
  --shell-height: 76px;
  --header-min-height: 76px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #f3f4f0;
  --panel: #ffffff;
  --raised: #edf1f5;
  --line: #d6dfe6;
  --text: #17243a;
  --muted: #53637a;
  --orange: #975019;
  --primary: #ffb579;
  --on-primary: #222334;
  --mint: #266c53;
  --lilac: #6b4d9f;
  --accent-wash: #e88b3410;
  --mint-wash: #33996c0a;
  --subtle: #20385903;
  --nav-active: #fbe9d9;
  --danger: #a33047;
  --danger-wash: #bd30470a;
  --shadow: 0 16px 44px #24374e0b;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { scroll-padding-top: calc(var(--shell-height) + 20px); }
body { margin: 0; background: var(--bg); color: var(--text); min-height: 100dvh; }
button, input, select { font: inherit; }
button, a, input, select { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; color: inherit; }
button:disabled { cursor: not-allowed; opacity: .52; }
button, a { touch-action: manipulation; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, summary:focus-visible {
  outline: 3px solid var(--orange); outline-offset: 4px;
}
a { color: inherit; }
svg { display: block; width: 100%; height: 100%; }
button svg { pointer-events: none; }
h1, h2, h3, p { overflow-wrap: anywhere; }
h1 { font-size: clamp(29px, 3.05vw, 44px); line-height: 1.08; letter-spacing: -1.7px; margin: 0 0 10px; font-weight: 800; }
h1 em { color: var(--orange); font-style: normal; }
h2 { font-size: 20px; line-height: 1.2; letter-spacing: -.6px; margin: 0 0 10px; }
h3 { font-size: 15px; line-height: 1.35; margin: 0 0 8px; }
p { line-height: 1.6; }
.skip { position: fixed; top: -80px; left: 20px; z-index: 100; background: var(--primary); color: var(--on-primary); padding: 14px 18px; border-radius: 12px; }
.skip:focus { top: 12px; }
.topbar { position: sticky; top: 0; z-index: 40; min-height: var(--header-min-height); padding: 12px clamp(18px, 3vw, 42px); display: flex; align-items: center; gap: 22px; background: var(--bg); border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; text-decoration: none; font-size: 21px; font-weight: 850; letter-spacing: -.8px; }
.brand img { width: 27px; height: 33px; }
.brand small { font-size: 22px; letter-spacing: -.9px; font-weight: 800; color: var(--orange); margin-left: -4px; }
.brand-word { color: var(--text); }
.tag { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--line); border-radius: 99px; padding: 6px 10px; font-size: 10px; line-height: 1.3; letter-spacing: .65px; font-weight: 750; text-transform: uppercase; }
.tag i { width: 5px; height: 5px; background: var(--mint); border-radius: 50%; flex: none; }
.topbar > .tag { flex-shrink: 0; }
.balances { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.balance { display: flex; align-items: center; gap: 7px; background: var(--panel); border: 1px solid var(--line); padding: 8px 12px; border-radius: 12px; font-size: 11px; min-height: 40px; }
.balance strong { font-size: 15px; font-variant-numeric: tabular-nums; }
.balance .symbol { color: var(--orange); font-size: 19px; }
.balance-label { color: var(--muted); }
.topbar-tools { display: flex; align-items: center; gap: 6px; flex: none; }
.topbar-tools .icon-button { background: transparent; border-radius: 12px; width: 44px; height: 44px; font-size: 16px; }
#connection-status { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
#connection-status:before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--mint); }
.layout { display: grid; grid-template-columns: 204px minmax(0, 1fr); width: min(100%, 1660px); margin: auto; min-height: calc(100dvh - var(--shell-height)); }
.layout > div { min-width: 0; }
.side { padding: 28px 16px; border-right: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; position: sticky; top: var(--shell-height); height: calc(100dvh - var(--shell-height)); overflow-y: auto; overscroll-behavior: contain; }
.nav-label { margin: 5px 10px 15px; font-size: 9px; letter-spacing: 1.6px; color: var(--muted); font-weight: 750; }
.nav-button { width: 100%; display: flex; align-items: center; gap: 11px; text-align: left; padding: 13px 12px; border-radius: 12px; background: transparent; border: 1px solid transparent; color: var(--muted); font-weight: 650; font-size: 12px; min-height: 46px; }
.nav-button .nav-icon { width: 20px; text-align: center; font-size: 21px; flex: none; line-height: 1; }
.nav-button:hover { background: var(--subtle); color: var(--text); }
.nav-button[aria-current="page"] { background: var(--nav-active); border-color: color-mix(in srgb, var(--orange) 25%, transparent); color: var(--orange); }
.side-note { margin-top: auto; padding: 30px 10px 0; color: var(--muted); font-size: 11px; line-height: 1.7; }
.side-note strong { display: block; color: var(--text); font-size: 12px; margin-bottom: 5px; }
.main { padding: 30px clamp(22px, 3vw, 42px) 54px; min-width: 0; }
.eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 1.65px; color: var(--orange); text-transform: uppercase; margin: 0 0 10px; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 26px; }
.page-heading > div { min-width: 0; }
.page-heading > .btn { flex: none; margin-top: 18px; }
.subtitle { color: var(--muted); font-size: 13px; margin: 0; max-width: 580px; }
.muted { color: var(--muted); }
.small { font-size: 12px; line-height: 1.65; }
.save-status { font-size: 11px; color: var(--mint); margin-top: 5px; display: block; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 11px 16px; border-radius: 11px; border: 1px solid var(--line); font-weight: 750; font-size: 12px; text-decoration: none; background: var(--raised); line-height: 1.35; transition: background .16s, border-color .16s; }
.btn:hover:not(:disabled) { border-color: var(--muted); background: color-mix(in srgb, var(--raised) 88%, var(--text)); }
.btn.primary { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.btn.primary:hover:not(:disabled) { background: #ffc38f; border-color: #ffc38f; }
.btn.soft { background: var(--mint-wash); color: var(--mint); border-color: color-mix(in srgb, var(--mint) 32%, transparent); }
.btn.danger { background: var(--danger-wash); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 32%, transparent); }
.btn.link { background: transparent; border-color: transparent; padding: 9px 0; color: var(--orange); }
.btn.wide { width: 100%; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 20px; }
.grid-home { display: grid; grid-template-columns: minmax(0, 1.17fr) minmax(300px, .83fr); gap: 22px; align-items: start; }
.grid-home > section, .grid-home > div { min-width: 0; }
.stack { display: flex; flex-direction: column; gap: 16px; }
.stage { --stage-base: #476775; position: relative; isolation: isolate; overflow: hidden; border: 1px solid #bcd9cf42; border-radius: 24px; background: radial-gradient(ellipse at 50% 34%, color-mix(in srgb, var(--pal-accent) 64%, #91a6a4) 0, var(--stage-base) 59%, #233b50 100%); height: clamp(330px, 29vw, 415px); }
.stage:before { content: ""; position: absolute; width: 290px; height: 290px; border: 1px solid #f6efdc38; border-radius: 50%; left: 50%; top: 43%; transform: translate(-50%, -50%); box-shadow: 0 0 0 26px #f4edd405, 0 0 0 27px #f4edd412, 0 0 0 61px #f4edd406; z-index: -1; }
.stage:after { content: ""; position: absolute; left: 14%; right: 14%; bottom: 25px; height: 65px; border-radius: 50%; background: linear-gradient(#e1d9c2, #bcc5b1); box-shadow: 0 9px 0 #becbb51b, 0 20px 22px #17293b55; z-index: -1; }
.stage-top { position: absolute; left: 17px; right: 17px; top: 16px; display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; z-index: 2; }
.stage-top .tag { border-color: #d9e3df44; background: #182a3966; color: #f4f6ea; font-size: 9px; }
.stage-top .tag i { background: #b6e6cf; }
.stage-caption { position: absolute; bottom: 10px; left: 15px; right: 15px; text-align: center; font-size: 9px; color: #eef4e7; letter-spacing: 1px; text-transform: uppercase; }
.pal-art { width: min(84%, 340px); height: calc(100% - 62px); position: absolute; left: 50%; bottom: 36px; transform: translateX(-50%); background: none; border: none; padding: 0; animation: float 5s ease-in-out infinite; filter: drop-shadow(0 10px 11px #18263930); border-radius: 32px; }
.pal-art.boop { animation: boop .5s ease-in-out; }
.spark { position: absolute; left: calc(50% + 68px); top: 77px; color: #ffe4ba; font-size: 32px; animation: spark .9s ease-out forwards; z-index: 5; pointer-events: none; }
.pal-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 15px 0 10px; }
.pal-bar h2 { margin: 0; font-size: 24px; letter-spacing: -.8px; }
.pal-bar .small { margin-top: 4px; }
.quote { font-size: 12px; line-height: 1.65; color: var(--muted); margin: 0 0 15px; }
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 13px; padding: 11px 13px; }
.stat-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .7px; display: flex; justify-content: space-between; gap: 4px; }
.stat strong { font-size: 23px; display: block; line-height: 1.45; font-variant-numeric: tabular-nums; }
.stat:nth-child(1) { color: var(--lilac); }
.stat:nth-child(2) { color: var(--mint); }
.stat:nth-child(3) { color: var(--orange); }
.stat-line { height: 3px; background: var(--line); border-radius: 3px; overflow: hidden; }
.stat-line i { display: block; height: 100%; background: currentColor; max-width: 100%; }
.slot-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.slot-button { border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 8px; min-height: 82px; }
.slot-button:hover { border-color: var(--orange); }
.slot-art { width: 46px; height: 43px; margin: 0 auto 6px; }
.slot-button span { font-size: 9px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }
.card-label { color: var(--orange); font-size: 9px; letter-spacing: 1.25px; text-transform: uppercase; font-weight: 800; margin: 0 0 12px; }
.parcel-box { background: radial-gradient(ellipse at 100% 0, var(--accent-wash), transparent 75%), var(--panel); }
.parcel-row { display: flex; gap: 16px; align-items: center; margin-bottom: 15px; }
.parcel-art { width: 78px; height: 78px; flex: none; position: relative; display: grid; place-items: center; font-size: 40px; border-radius: 18px; background: var(--accent-wash); transform: rotate(-5deg); border: 1px solid color-mix(in srgb, var(--orange) 18%, transparent); padding: 5px; }
.parcel-art:after { content: "✧"; font-size: 20px; position: absolute; right: -5px; top: -4px; color: var(--orange); }
.parcel-text { min-width: 0; }
.parcel-text h2 { margin-bottom: 5px; }
.parcel-text p { font-size: 12px; color: var(--muted); margin: 5px 0; }
.parcel-count { display: flex; gap: 5px; margin-top: 9px; }
.parcel-count i { height: 5px; width: 25px; border-radius: 4px; background: var(--line); }
.parcel-count i.filled { background: var(--orange); }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.card-footer small { font-size: 10px; line-height: 1.6; color: var(--muted); max-width: 165px; }
.mini-story { display: flex; align-items: center; gap: 12px; background: var(--subtle); border: 1px solid var(--line); border-radius: 13px; padding: 11px; margin: 12px 0; }
.mini-story-icon { width: 46px; height: 46px; border-radius: 11px; display: grid; place-items: center; background: color-mix(in srgb, var(--lilac) 10%, transparent); color: var(--lilac); font-size: 24px; flex: none; }
.mini-story h3 { margin: 0 0 3px; font-size: 13px; }
.mini-story p { font-size: 11px; color: var(--muted); margin: 0; }
.chevron { margin-left: auto; color: var(--muted); }
.goal-row { display: flex; align-items: center; gap: 12px; }
.goal-row > div { min-width: 0; }
.goal-art { width: 63px; height: 63px; flex: none; background: var(--subtle); border-radius: 13px; padding: 7px; }
.progress { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; margin: 10px 0 6px; }
.progress i { height: 100%; display: block; background: var(--mint); border-radius: 99px; max-width: 100%; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin: 0 0 15px; }
.section-head h2 { margin: 0; }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.chip { border: 1px solid var(--line); background: var(--panel); border-radius: 11px; padding: 10px 14px; min-height: 44px; font-size: 11px; font-weight: 650; color: var(--muted); }
.chip.active { border-color: color-mix(in srgb, var(--orange) 36%, transparent); background: var(--nav-active); color: var(--orange); }
.items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.item-card { --rarity: var(--muted); position: relative; border: 1px solid var(--line); border-radius: 17px; overflow: hidden; background: var(--panel); display: flex; flex-direction: column; min-width: 0; }
.item-card.common { --rarity: var(--muted); }
.item-card.rare { --rarity: var(--mint); }
.item-card.epic { --rarity: var(--lilac); }
.item-card.legendary { --rarity: var(--orange); }
.item-visual { height: 145px; background: radial-gradient(ellipse at center, color-mix(in srgb, var(--rarity) 10%, transparent), transparent 75%), var(--subtle); display: grid; place-items: center; position: relative; padding: 24px 18px 14px; }
.item-visual svg { max-width: 110px; max-height: 105px; }
.rarity-dot { position: absolute; left: 12px; top: 13px; width: 6px; height: 6px; border-radius: 50%; background: var(--rarity); }
.equipped-pill { position: absolute; right: 8px; top: 8px; font-size: 9px; background: var(--panel); border: 1px solid color-mix(in srgb, var(--mint) 40%, transparent); color: var(--mint); border-radius: 99px; padding: 4px 6px; }
.item-body { padding: 13px; display: flex; flex-direction: column; flex: 1; border-top: 1px solid var(--line); }
.item-body h3 { font-size: 12px; line-height: 1.4; margin: 0 0 6px; min-height: 34px; }
.item-meta { font-size: 10px; color: var(--muted); margin-bottom: 12px; line-height: 1.55; }
.item-body .btn { font-size: 11px; min-height: 44px; padding: 9px; margin-top: auto; }
.item-buttons { display: flex; gap: 6px; margin-top: auto; }
.item-buttons .btn:first-child { flex: 1; }
.item-buttons .btn:last-child { padding: 8px 10px; min-width: 44px; }
.rarity { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--rarity); margin-top: 8px; }
.notice { padding: 15px 18px; border: 1px solid var(--line); border-radius: 13px; background: var(--subtle); color: var(--muted); font-size: 12px; line-height: 1.75; margin: 0 0 20px; }
.notice strong { color: var(--text); }
.empty { text-align: center; padding: 55px 20px; border: 1px dashed var(--line); border-radius: 20px; background: var(--panel); }
.empty .empty-icon { font-size: 38px; color: var(--orange); margin-bottom: 15px; }
.empty p { max-width: 380px; margin: 10px auto 20px; color: var(--muted); font-size: 13px; }
.work-layout { display: grid; grid-template-columns: minmax(0, 1fr) 255px; gap: 22px; }
.work-layout > section, .work-layout > aside { min-width: 0; }
.module-card { padding: 12px; border: 1px solid var(--line); border-radius: 11px; display: flex; align-items: center; justify-content: space-between; gap: 7px; margin-top: 9px; font-size: 12px; }
.module-card strong { color: var(--orange); }
.howto { margin: 18px 0 0; padding: 0; list-style: none; }
.howto li { border-top: 1px solid var(--line); padding: 13px 0; font-size: 12px; line-height: 1.7; color: var(--muted); }
.howto strong { display: block; color: var(--text); }
.adventure-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px; }
.story-card { border: 1px solid var(--line); border-radius: 20px; overflow: hidden; background: var(--panel); display: flex; flex-direction: column; min-width: 0; }
.story-scene { height: 152px; position: relative; overflow: hidden; background: linear-gradient(145deg, #617c86, #303750); border-bottom: 1px solid var(--line); }
.story-scene.cafe { background: linear-gradient(155deg, #be9d80, #4d5a69); }
.story-scene.trail { background: linear-gradient(160deg, #bdcbb3, #447d78); }
.story-scene.market { background: linear-gradient(155deg, #d8b27e, #70584c); }
.story-scene.beach { background: linear-gradient(155deg, #f1c27d, #568ea0); }
.story-scene.museum { background: linear-gradient(155deg, #c7a5bd, #66536f); }
.story-scene.night { background: linear-gradient(155deg, #745d9d, #25324c); }
.story-scene.sport { background: linear-gradient(155deg, #e6a16f, #75644c); }
.story-scene.wellness { background: linear-gradient(155deg, #b6d8ca, #557a74); }
.story-scene.festival { background: linear-gradient(155deg, #e59b83, #75506d); }
.story-scene:before { content: ""; position: absolute; width: 78px; height: 78px; top: 18px; right: 26px; border-radius: 50%; background: #fff0bf66; box-shadow: 0 0 0 18px #fff0bf0a; }
.story-scene:after { content: ""; position: absolute; bottom: -40px; left: -10%; width: 125%; height: 90px; border-radius: 50%; background: #243c42; }
.scene-icon { position: absolute; left: 20px; top: 26px; font-size: 42px; z-index: 1; filter: drop-shadow(0 4px 0 #0001); color: #fce9ca; }
.scene-word { position: absolute; bottom: 14px; left: 20px; right: 15px; color: #fff1d6; z-index: 2; font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 800; }
.story-body { padding: 19px; display: flex; flex-direction: column; flex: 1; }
.story-body h2 { font-size: 19px; }
.story-body p { font-size: 12px; color: var(--muted); margin: 0 0 15px; }
.story-body .btn { margin-top: auto; }
.story-label { font-size: 10px; color: var(--mint); margin: 0 0 13px; line-height: 1.6; }
.run-layout { max-width: 790px; margin: 0 auto; }
.run-scene { height: 150px; border-radius: 18px; position: relative; overflow: hidden; background: linear-gradient(140deg, #626679, #2c3b50); margin-bottom: 22px; color: #f3f5fa; }
.run-scene svg { position: absolute; right: 18px; bottom: -20px; width: 160px; height: 170px; }
.run-scene span { position: absolute; left: 24px; bottom: 26px; font-size: 23px; font-weight: 800; max-width: 60%; }
.step-dots { display: flex; gap: 6px; margin-bottom: 20px; }
.step-dots i { height: 5px; flex: 1; background: var(--line); border-radius: 5px; }
.step-dots i.done { background: var(--mint); }
.choice { width: 100%; text-align: left; border: 1px solid var(--line); background: var(--panel); border-radius: 15px; display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 17px; margin: 10px 0; min-height: 76px; }
.choice:hover { border-color: var(--orange); background: var(--raised); }
.choice > span:first-child { min-width: 0; }
.choice strong { font-size: 13px; display: block; }
.choice small { font-size: 11px; color: var(--muted); display: block; margin-top: 6px; line-height: 1.6; }
.choice .check { font-size: 11px; color: var(--mint); flex: none; }
.choice .check.low { color: var(--orange); }
.journal { padding: 15px 18px; border-left: 3px solid var(--mint); background: var(--mint-wash); border-radius: 0 12px 12px 0; margin: 12px 0 22px; }
.journal strong { font-size: 12px; }
.journal p { font-size: 12px; margin: 7px 0 0; color: var(--muted); }
.city-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }
.city-card { background: var(--panel); border: 1px solid var(--line); border-radius: 17px; padding: 19px; position: relative; overflow: hidden; }
.city-card .city-art { height: 110px; margin: 0 auto 15px; max-width: 130px; }
.city-card.locked .city-art { opacity: .57; }
.city-card h3 { margin: 0 0 5px; }
.city-card p { font-size: 11px; margin: 7px 0 12px; color: var(--muted); }
.city-card .tag { font-size: 9px; }
.cast-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
.cast-card { --family-accent: var(--pal-accent); text-align: center; border: 1px solid var(--line); border-radius: 18px; padding: 14px 11px; background: radial-gradient(ellipse at 50% 25%, color-mix(in srgb, var(--family-accent) 8%, transparent), transparent 62%), var(--panel); min-width: 0; display: flex; flex-direction: column; align-items: center; }
.cast-card.selected { border-color: var(--orange); box-shadow: inset 0 0 0 1px var(--orange); }
.cast-card svg { width: 100%; height: 160px; margin-bottom: 6px; }
.cast-card h3 { font-size: 17px; letter-spacing: -.3px; margin: 5px 0; }
.cast-card small { font-size: 10px; color: var(--muted); line-height: 1.5; }
.cast-card .btn { width: 100%; font-size: 11px; margin-top: 14px; padding: 8px; }
.cast-card .family-title { color: var(--orange); font-size: 9px; text-transform: uppercase; letter-spacing: .6px; margin: 3px 0 7px; }
.cast-card .family-description { font-size: 11px; color: var(--muted); margin: 0 0 10px; line-height: 1.6; }
.cast-card .family-description + .btn { margin-top: auto; }
.adoption { max-width: 1120px; margin: 0 auto; }
.layout:has(.adoption) { display: block; }
.adopt-intro { text-align: center; margin: 10px 0 28px; }
.adopt-intro h1 { font-size: clamp(31px, 4.5vw, 52px); }
.adopt-intro .subtitle { margin: auto; }
.adopt-bottom { display: flex; align-items: end; gap: 20px; margin: 24px 0 0; position: sticky; bottom: 18px; background: var(--panel); border: 1px solid var(--line); padding: 18px; border-radius: 17px; box-shadow: var(--shadow); z-index: 5; }
.adopt-bottom input { flex: 1; min-width: 0; }
.adopt-bottom .btn { min-height: 47px; }
.input { background: var(--bg); border: 1px solid var(--line); border-radius: 11px; padding: 12px; color: var(--text); min-height: 46px; min-width: 0; width: 100%; font-size: 14px; }
.field-label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 8px; line-height: 1.5; }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.settings-grid .panel p { font-size: 12px; color: var(--muted); }
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 0; }
.toggle-row input { width: 24px; height: 24px; accent-color: var(--orange); flex: none; }
.toggle-row label { font-size: 13px; font-weight: 700; padding: 10px 0; }
.shop-banner { display: flex; justify-content: space-between; align-items: center; padding: 20px 23px; gap: 16px; border-radius: 18px; background: linear-gradient(110deg, color-mix(in srgb, var(--lilac) 12%, var(--panel)), color-mix(in srgb, var(--mint) 7%, var(--panel))); border: 1px solid var(--line); margin-bottom: 23px; }
.shop-banner h2 { margin: 0 0 6px; }
.shop-banner p { margin: 0; font-size: 12px; color: var(--muted); }
.shop-banner strong { font-size: 27px; color: var(--orange); flex: none; }
.mobile-nav { display: none; }
dialog { color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 0; width: min(560px, calc(100vw - 24px)); max-height: calc(100dvh - 32px); box-shadow: 0 25px 90px #0007; overflow-y: auto; overscroll-behavior: contain; }
dialog::backdrop { background: #07101de0; }
.dialog-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid var(--line); gap: 16px; position: sticky; top: 0; background: var(--panel); z-index: 2; }
.dialog-head h2 { margin: 0; font-size: 18px; }
.icon-button { border: 1px solid var(--line); background: var(--raised); border-radius: 11px; min-width: 44px; min-height: 44px; font-size: 20px; display: grid; place-items: center; flex: none; }
.dialog-body { padding: 22px; }
.detail-art { height: 150px; max-width: 175px; margin: 0 auto 16px; }
.detail-summary { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px; }
.detail-summary span { font-size: 11px; padding: 6px 10px; border: 1px solid var(--line); border-radius: 99px; }
.dialog-actions { display: flex; flex-wrap: wrap; gap: 9px; margin: 17px 0; }
.dialog-actions .btn { flex: 1; min-width: 115px; }
.socket-grid { display: grid; gap: 10px; margin: 15px 0; }
.socket-line { display: grid; grid-template-columns: 75px minmax(0, 1fr); align-items: center; gap: 9px; font-size: 12px; color: var(--muted); }
.socket-line select { font-size: 12px; padding: 9px; min-height: 44px; }
.socket-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin: 20px 0 8px; color: var(--muted); line-height: 1.6; }
.detail-info { font-size: 12px; color: var(--muted); line-height: 1.75; border-top: 1px solid var(--line); padding-top: 15px; }
.reward-art { height: 160px; width: 160px; margin: 15px auto 18px; animation: reward .5s ease-out; }
.reward-summary { text-align: center; }
.reward-summary h3 { font-size: 25px; color: var(--orange); }
.reward-summary p { font-size: 13px; color: var(--muted); }
.toast { position: fixed; right: 24px; bottom: 25px; max-width: min(420px, calc(100vw - 24px)); background: var(--panel); border: 1px solid var(--mint); color: var(--text); box-shadow: var(--shadow); border-radius: 15px; padding: 15px 18px; font-size: 12px; line-height: 1.65; z-index: 99; display: none; overflow-wrap: anywhere; pointer-events: none; }
.toast.show { display: block; animation: reward .2s ease-out; }
.toast.error { border-color: var(--danger); }
.toast strong { display: block; font-size: 13px; margin-bottom: 3px; }
.toast button { margin-top: 8px; pointer-events: auto; }
.loading { display: grid; place-items: center; text-align: center; min-height: 60dvh; }
.loading .orb { font-size: 48px; color: var(--orange); animation: reward 1s ease-in-out infinite alternate; }
.skeleton { background: var(--raised); height: 16px; width: 200px; border-radius: 8px; margin: 12px; }
.activity { padding: 13px 16px; border-radius: 12px; background: var(--subtle); border: 1px solid var(--line); margin-top: 18px; font-size: 11px; color: var(--muted); line-height: 1.75; }
.activity strong { color: var(--text); }
.busy-indicator { position: fixed; top: 0; left: 0; height: 3px; background: var(--orange); width: 100%; z-index: 100; transform: scaleX(0); transform-origin: left; transition: transform .2s; }
.busy .busy-indicator { transform: scaleX(.85); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
/* Retention and arcade panels use the same card, action and progress language. */
.daily-board, .bond-card, .arcade-preview { border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 18px; }
.daily-goals { display: grid; gap: 9px; }
.goal-task { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--line); padding: 12px 0; }
.goal-task:last-child { padding-bottom: 0; }
.goal-task h3 { font-size: 12px; margin: 0 0 4px; }
.goal-task p { font-size: 11px; color: var(--muted); margin: 0; }
.goal-task .btn { padding: 9px 12px; flex: none; }
.bond-meter { display: flex; align-items: center; gap: 12px; }
.bond-meter .progress { flex: 1; }
.quick-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.quick-actions .btn { min-width: 0; padding: 10px 8px; font-size: 11px; }
.arcade-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 17px; }
.arcade-card { min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 20px; background: var(--panel); padding: 20px; display: flex; flex-direction: column; gap: 10px; }
.arcade-card h2 { margin-bottom: 0; }
.arcade-card p { color: var(--muted); font-size: 12px; margin: 0 0 8px; }
.arcade-card .btn { margin-top: auto; }
.arcade-icon { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center; font-size: 30px; color: var(--lilac); background: color-mix(in srgb, var(--lilac) 10%, transparent); margin-bottom: 8px; }
.game-panel, .game-shell { max-width: 760px; margin: 0 auto; border: 1px solid var(--line); border-radius: 22px; padding: 22px; background: var(--panel); }
.game-hud { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding-bottom: 18px; }
.game-hud strong { font-variant-numeric: tabular-nums; }
.game-board { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--bg); }
.game-grid, .memory-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.game-tile, .memory-tile { display: grid; place-items: center; border: 1px solid var(--line); border-radius: 14px; min-height: 70px; padding: 12px; background: var(--raised); color: var(--text); font-size: 24px; aspect-ratio: 1; }
.game-tile[aria-pressed="true"], .memory-tile.flipped { border-color: var(--orange); background: var(--accent-wash); }
.game-tile.matched, .memory-tile.matched { border-color: var(--mint); background: var(--mint-wash); color: var(--mint); }
.game-result { text-align: center; padding: 24px 12px; }
.game-result strong { color: var(--orange); font-size: 34px; }
.game-controls { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 18px; }

.bond-track { margin: 12px 0; padding: 13px 15px; background: var(--panel); border: 1px solid var(--line); border-radius: 13px; }
.bond-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 11px; font-weight: 750; }
.bond-heading > span:last-child { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; }
.bond-symbol { color: var(--lilac); font-size: 15px; }
.bond-track .progress { height: 4px; margin: 9px 0 6px; }
.bond-track .progress i { background: var(--lilac); }
.bond-track p { font-size: 10px; color: var(--muted); margin: 0; }
.care-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 12px 0; }
.care-button { min-height: 64px; display: grid; grid-template-columns: 24px minmax(0, 1fr); grid-template-rows: auto auto; align-content: center; column-gap: 8px; row-gap: 3px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; text-align: left; padding: 9px 11px; }
.care-button > span { grid-row: 1 / -1; align-self: center; font-size: 25px; color: var(--orange); }
.care-button strong { font-size: 12px; }
.care-button small { font-size: 9px; color: var(--mint); }
.care-button.done small { color: var(--muted); }
.care-button:hover { border-color: var(--orange); background: var(--accent-wash); }
.loadout-disclosure { background: var(--panel); border: 1px solid var(--line); border-radius: 13px; margin-top: 13px; }
.loadout-disclosure summary { cursor: pointer; padding: 14px 15px; min-height: 52px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; list-style: none; }
.loadout-disclosure summary::-webkit-details-marker { display: none; }
.loadout-disclosure summary:after { content: '+'; margin-left: auto; color: var(--orange); font-size: 18px; }
.loadout-disclosure[open] summary:after { content: '−'; }
.loadout-disclosure summary strong { font-size: 11px; }
.loadout-disclosure summary > span { font-size: 10px; color: var(--muted); }
.loadout-disclosure > div { padding: 0 12px 4px; }
.journey-card .section-head, .weekly-card .section-head { align-items: flex-start; margin-bottom: 10px; }
.journey-card .card-label, .weekly-card .card-label { margin-bottom: 6px; }
.journey-count { font-size: 27px; font-weight: 750; letter-spacing: -1px; color: var(--mint); line-height: 1.2; flex: none; }
.journey-count small { font-size: 13px; color: var(--muted); font-weight: 500; letter-spacing: 0; }
.journey-tasks { display: grid; gap: 1px; }
.journey-task { display: flex; align-items: center; gap: 11px; width: 100%; background: transparent; border: 0; border-radius: 10px; padding: 10px 0; min-height: 55px; text-align: left; }
.journey-task:hover { background: var(--subtle); }
.journey-task > span:nth-child(2) { min-width: 0; flex: 1; }
.task-check { border: 1px solid var(--line); border-radius: 50%; width: 20px; height: 20px; font-size: 11px; display: grid; place-items: center; flex: none; }
.journey-task.done .task-check { color: var(--mint); background: var(--mint-wash); border-color: var(--mint); }
.journey-task strong { display: block; font-size: 11px; margin-bottom: 3px; }
.journey-task small { display: block; font-size: 10px; color: var(--muted); line-height: 1.5; }
.task-arrow { color: var(--muted); font-size: 15px; }
.journey-reward { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 13px; }
.journey-reward > span { color: var(--orange); font-size: 12px; font-weight: 750; }
.journey-reward small { display: block; color: var(--muted); font-size: 10px; font-weight: 500; margin-top: 4px; }
.journey-reward .btn { padding: 10px 12px; font-size: 11px; }
.weekly-card > p { margin: 10px 0; }
.collection-filters { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 10px; margin-bottom: 13px; }
.collection-filters label { min-width: 0; }
.collection-filters .input { font-size: 12px; background: var(--panel); }
.collection-results { margin: -7px 0 16px; font-size: 11px; color: var(--muted); }
.settings-details summary { min-height: 44px; padding: 12px 0; cursor: pointer; font-size: 12px; color: var(--orange); font-weight: 700; }
.settings-details > p { line-height: 1.75; }
.cast-preview-note { text-align: center; margin: -7px 0 22px; color: var(--muted); font-size: 11px; }
.story-overview { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 16px; padding: 16px 18px; margin-bottom: 22px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); }
.story-overview > div { display: flex; gap: 7px; flex-wrap: wrap; }
.story-overview p { max-width: 400px; color: var(--muted); font-size: 11px; margin: 0; }
.stat-pill { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); padding: 7px 10px; background: var(--subtle); border: 1px solid var(--line); border-radius: 9px; }
.stat-pill strong { color: var(--text); font-size: 13px; }
@media (max-width: 540px) {
  .care-button { padding: 9px; column-gap: 5px; grid-template-columns: 21px minmax(0, 1fr); }
  .care-button > span { font-size: 22px; }
  .care-button strong { font-size: 11px; }
  .care-button small { font-size: 9px; }
  .loadout-disclosure summary { gap: 7px; }
  .loadout-disclosure summary > span { font-size: 9px; }
  .collection-filters { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .collection-filters .input { font-size: 16px; }
}

@keyframes float { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }
@keyframes boop { 0%, 100% { transform: translateX(-50%) rotate(0); } 25% { transform: translateX(-50%) rotate(-7deg) translateY(-8px); } 65% { transform: translateX(-50%) rotate(5deg); } }
@keyframes spark { 0% { opacity: 0; transform: translateY(20px) scale(.5); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateY(-30px) scale(1.2); } }
@keyframes reward { from { opacity: .3; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
@media (min-width: 1450px) {
  .main { padding-top: 34px; }
  .grid-home { grid-template-columns: minmax(0, 1.22fr) minmax(340px, .78fr); gap: 26px; }
  .stack { gap: 18px; }
  .panel { padding: 22px; }
  .items-grid { grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); }
}
@media (max-width: 1180px) {
  .layout { grid-template-columns: 166px minmax(0, 1fr); }
  .main { padding: 26px 24px 44px; }
  .side { padding: 24px 10px; }
  .nav-button { font-size: 11px; gap: 8px; padding: 12px 9px; }
  .topbar { gap: 16px; }
  .topbar > .tag { display: none; }
  .grid-home { gap: 17px; grid-template-columns: minmax(0, 1fr) minmax(280px, .9fr); }
  .stage { height: 350px; }
  .panel { padding: 18px; }
  .cast-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .work-layout { grid-template-columns: minmax(0, 1fr) 220px; gap: 17px; }
  .adventure-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .arcade-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .city-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 960px) {
  :root { --shell-height: 72px; --header-min-height: 72px; }
  .layout { grid-template-columns: minmax(0, 1fr); }
  .side { display: none; }
  .main { padding: 25px 24px calc(98px + env(safe-area-inset-bottom)); }
  .topbar { padding: 12px 24px; }
  .mobile-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; background: var(--panel); border-top: 1px solid var(--line); padding: 7px max(8px, calc((100vw - 720px) / 2)) calc(7px + env(safe-area-inset-bottom)); justify-content: space-around; gap: 2px; }
  .mobile-nav button { display: flex; flex: 1; flex-direction: column; justify-content: center; align-items: center; gap: 5px; padding: 8px 3px; background: transparent; border: 1px solid transparent; border-radius: 11px; width: auto; min-width: 0; min-height: 52px; color: var(--muted); font-size: 9px; text-align: center; line-height: 1.3; }
  .mobile-nav .nav-icon { font-size: 21px; }
  .mobile-nav button[aria-current="page"] { color: var(--orange); background: var(--nav-active); border-color: transparent; }
  .cast-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .cast-card svg { height: 165px; }
  .toast { bottom: calc(87px + env(safe-area-inset-bottom)); }
  .adopt-bottom { bottom: 12px; }
  .settings-grid { gap: 16px; }
}
@media (max-width: 720px) {
  .grid-home { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .grid-home > .stack { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-home > .stack > :first-child { grid-column: 1 / -1; }
  .stage { height: 360px; }
  .stage .pal-art { width: 310px; }
  .page-heading h1 { font-size: 32px; }
  .page-heading > .btn { font-size: 11px; padding: 10px 11px; margin-top: 12px; }
  .work-layout { grid-template-columns: minmax(0, 1fr); }
  .work-layout aside { order: -1; }
  .work-layout .module-supply { display: flex; gap: 8px; }
  .module-card { flex: 1; padding: 10px; font-size: 11px; }
  .howto { margin-top: 12px; }
  .howto li { padding: 10px 0; }
  .cast-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .city-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 540px) {
  :root { --shell-height: 113px; --header-min-height: 113px; }
  .topbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; padding: 10px 16px; gap: 6px 10px; }
  .brand { font-size: 20px; gap: 7px; }
  .brand img { width: 24px; height: 29px; }
  .brand small { font-size: 21px; }
  .topbar-tools { grid-column: 2; grid-row: 1; }
  .balances { grid-column: 1 / -1; grid-row: 2; justify-content: flex-start; gap: 6px; margin: 0; }
  .balance { padding: 5px 9px; border-radius: 9px; font-size: 10px; gap: 5px; min-height: 31px; }
  .balance strong { font-size: 12px; }
  .balance .symbol { font-size: 15px; }
  #connection-status { margin-left: auto; font-size: 10px; }
  .main { padding: 22px 16px calc(96px + env(safe-area-inset-bottom)); }
  .page-heading { margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
  .page-heading > .btn { margin-top: 0; }
  .page-heading h1 { font-size: 31px; letter-spacing: -1.1px; }
  .subtitle { font-size: 12px; }
  .eyebrow { font-size: 9px; letter-spacing: 1.25px; margin-bottom: 8px; }
  .grid-home > .stack { display: flex; }
  .stage { height: 320px; border-radius: 20px; }
  .stage .pal-art { height: 265px; width: 267px; bottom: 35px; }
  .stage:before { height: 222px; width: 222px; }
  .stage:after { bottom: 23px; height: 53px; }
  .stage-top { top: 13px; left: 12px; right: 12px; }
  .stage-top .tag { font-size: 8px; padding: 5px 7px; }
  .pal-bar { margin: 13px 0 10px; }
  .pal-bar .btn { font-size: 11px; padding: 10px 12px; }
  .quote { font-size: 11px; }
  .stats { gap: 8px; }
  .stat { padding: 10px 11px; }
  .stat strong { font-size: 22px; }
  .slot-button { min-height: 79px; padding: 7px; }
  .slot-art { height: 42px; }
  .panel { border-radius: 18px; padding: 18px; }
  .card-footer .btn { font-size: 11px; padding: 10px 12px; }
  .items-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .item-visual { height: 128px; padding: 26px 17px 11px; }
  .item-body { padding: 11px; }
  .item-body .btn { font-size: 10px; }
  .item-buttons { gap: 5px; }
  .item-buttons .btn:last-child { padding: 8px; }
  .work-layout .module-supply { gap: 7px; }
  .module-card { display: block; padding: 10px 8px; }
  .module-card strong { display: block; margin-top: 4px; }
  .work-layout aside h2 { font-size: 16px; }
  .adventure-grid, .arcade-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .story-scene { height: 133px; }
  .story-body { padding: 18px; }
  .city-grid { gap: 12px; }
  .city-card { padding: 14px; }
  .city-card .city-art { height: 92px; }
  .city-card h3 { font-size: 14px; }
  .city-card .tag { font-size: 8px; letter-spacing: .35px; padding: 6px 8px; }
  .cast-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .cast-card { padding: 13px 10px; }
  .cast-card svg { height: 158px; }
  .cast-card small { font-size: 10px; }
  .adopt-intro { margin: 0 0 22px; }
  .adopt-intro h1 { font-size: 34px; letter-spacing: -1.2px; }
  .adopt-bottom { flex-wrap: wrap; gap: 12px; bottom: 10px; padding: 14px; }
  .adopt-bottom > div { flex-basis: 100% !important; }
  .adopt-bottom .btn { width: 100%; }
  .input { font-size: 16px; }
  .settings-grid { grid-template-columns: minmax(0, 1fr); }
  .shop-banner { padding: 18px; gap: 12px; }
  .shop-banner h2 { font-size: 17px; }
  .shop-banner p { font-size: 11px; }
  .shop-banner strong { font-size: 22px; }
  .dialog-body { padding: 18px; }
  .dialog-head { padding: 13px 18px; }
  .detail-art { height: 130px; }
  .detail-summary { gap: 6px; }
  .dialog-actions { gap: 7px; }
  .dialog-actions .btn { font-size: 11px; padding: 10px; }
  .run-scene { height: 125px; }
  .run-scene span { font-size: 21px; left: 18px; max-width: 60%; }
  .run-scene svg { right: 0; width: 128px; height: 144px; }
  .choice { padding: 14px; gap: 10px; }
  .choice strong { font-size: 12px; }
  .choice small { font-size: 10px; }
  .choice .check { font-size: 10px; max-width: 70px; text-align: right; }
  .toast { left: 12px; right: 12px; max-width: none; }
  .toolbar { gap: 6px; }
  .toolbar > .small { flex-basis: 100%; padding-top: 3px; }
  .chip { font-size: 10px; padding: 9px 11px; }
  .section-head { gap: 10px; }
  .section-head h2 { font-size: 17px; }
  .game-panel, .game-shell { padding: 16px; }
  .game-board { padding: 10px; }
  .game-grid, .memory-grid { gap: 7px; }
  .game-tile, .memory-tile { min-height: 48px; padding: 7px; font-size: 22px; border-radius: 10px; }
}
@media (max-height: 570px) and (min-width: 541px) {
  .topbar { position: relative; }
  .side { top: 0; height: 100dvh; }
  .stage { height: 310px; }
  .main { padding-top: 18px; }
  .adopt-bottom { position: static; }
}
@media (prefers-reduced-motion: reduce) {
  *, *:before, *:after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}

/* Cinematic AkiPals reskin. Game state, vector families, wardrobe and inventory are unchanged. */
:root:not([data-theme="light"]) body {
  background:
    radial-gradient(ellipse at 88% 10%, rgba(250, 91, 45, .14), transparent 42%),
    radial-gradient(ellipse at 50% 60%, rgba(99, 53, 129, .11), transparent 58%),
    var(--bg);
}
:root:not([data-theme="light"]) .topbar {
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  border-bottom-color: rgba(255, 156, 93, .24);
  backdrop-filter: blur(18px);
}
:root:not([data-theme="light"]) .stage {
  background-image:
    radial-gradient(ellipse at 80% 35%, rgba(245, 103, 46, .16), transparent 60%),
    linear-gradient(145deg, #171d30, #101725);
}
:root:not([data-theme="light"]) :is(.panel, .card, .game-panel, .game-shell) {
  border-color: rgba(241, 165, 103, .17);
}
:root:not([data-theme="light"]) :is(.btn, .nav-button):focus-visible {
  outline: 3px solid #ffd0ac;
  outline-offset: 3px;
}
` + PALS_ARCADE_CSS;
