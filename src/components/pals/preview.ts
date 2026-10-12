import { PALS_CSS } from "./styles";
import { PALS_CLIENT } from "./client";
export { PALS_CSS, PALS_CLIENT };

/** Delivered only after server authorization, never in a public navigation bundle. */
export function previewHtml(nonce: string) {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0c1422">
<title>AkiPals · Your little world</title>
<link rel="icon" href="/icon.svg">
<style nonce="${nonce}">${PALS_CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="busy-indicator" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="/en" rel="nofollow" aria-label="Back to AkiPasa"><img src="/icon.svg" alt="" width="27" height="33"><span class="brand-word">Aki</span><small>Pals</small></a>
  <span class="tag"><i></i>Private playtest</span>
  <div class="balances" id="balances"><span id="connection-status">Connecting…</span></div>
  <div class="topbar-tools"><button type="button" class="icon-button" id="pals-theme" data-act="theme" aria-label="Switch to light theme" title="Switch to light theme"><span aria-hidden="true">☀</span></button></div>
</header>
<div class="layout">
  <nav class="side" id="nav" aria-label="AkiPals"></nav>
  <div>
    <main class="main" id="main" tabindex="-1"><noscript><h1>JavaScript is needed for this preview.</h1><p>Your saved collection has not changed.</p></noscript></main>
    <span class="sr-only" id="saved" role="status" aria-live="polite"></span>
  </div>
</div>
<nav class="mobile-nav" id="mobile-nav" aria-label="AkiPals mobile navigation"></nav>
<dialog id="dialog" aria-labelledby="dialog-title"></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script nonce="${nonce}">${PALS_CLIENT}</script>
</body>
</html>`;
}
