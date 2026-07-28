import type { CommandDescriptor } from "../command-router";
import type { CommandResult } from "../commands/types";
import type { DashboardData } from "./data";

type DashboardSection = "activity" | "commands" | "overview";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name: CommandDescriptor["icon"] | DashboardSection) {
  const paths = {
    overview:
      '<path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/>',
    commands:
      '<path d="m13 2 .8 3.1 2.7 1.6 3.1-.9 2.2 3.8-2.3 2.2v3.1l2.3 2.2-2.2 3.8-3.1-.9-2.7 1.6L13 24H8.6l-.8-3.1-2.7-1.6-3.1.9-2.2-3.8L2 14.2v-3.1L-.2 8.9 2 5.1l3.1.9 2.7-1.6L8.6 2H13Zm-2.2 7a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" transform="translate(1) scale(.92)"/>',
    activity:
      '<path d="M3 13h4l2-7 4 13 2-6h6v-2h-4.6L13 2 9 15 7.8 11H3v2Z"/>',
    expenses: '<path d="M4 5h16v14H4V5Zm2 3v2h12V8H6Zm0 5v3h5v-3H6Z"/>',
    report:
      '<path d="M5 3h10l4 4v14H5V3Zm9 2v3h3l-3-3ZM8 12h8v-2H8v2Zm0 4h8v-2H8v2Z"/>',
    revenue:
      '<path d="M4 19h16v2H4v-2Zm1-3 4-5 3 3 6-8 2 1.5-7.5 10-3.3-3.2L6.5 18 5 16Z"/>',
  } satisfies Record<string, string>;
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function page(content: string, title: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{color-scheme:light;--ink:#14211d;--muted:#62716b;--paper:#f4f0e5;--card:#fffdf7;--green:#0d6b55;--lime:#c9f16f;--line:#d8d5c9;--red:#b54036;--amber:#a46316}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 8% 0,#dff2c7,transparent 34rem),linear-gradient(125deg,#f4f0e5 0,#f8f5ed 62%,#e9efe4 100%);color:var(--ink);font-family:"Aptos","Segoe UI",sans-serif;min-height:100vh}
    a{color:inherit}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);width:min(1360px,100%);margin:auto;min-height:100vh}.rail{padding:1.4rem;display:flex;flex-direction:column;gap:2rem;border-right:1px solid #d8d5c988;background:#f8f5ed99;backdrop-filter:blur(16px)}
    .brand{font:900 1.2rem Georgia,serif;text-decoration:none}.brand small{display:block;font:800 .65rem "Aptos","Segoe UI",sans-serif;letter-spacing:.16em;color:var(--green);margin-bottom:.3rem}.nav{display:grid;gap:.45rem}.nav a{display:flex;align-items:center;gap:.75rem;padding:.8rem;border-radius:.9rem;text-decoration:none;color:var(--muted);font-weight:800}.nav a[aria-current=page]{background:var(--ink);color:white;box-shadow:0 10px 25px #14211d2a}.nav svg,.command-icon svg{width:1.25rem;height:1.25rem;fill:currentColor}
    .logout{margin-top:auto}.logout button,.button{border:0;border-radius:.85rem;background:var(--ink);color:white;padding:.8rem 1rem;font:800 .9rem inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.main{min-width:0;padding:2rem clamp(1rem,4vw,4rem) 4rem}.top{display:flex;justify-content:space-between;gap:1rem;align-items:end;margin-bottom:2rem}.top p{max-width:42rem;color:var(--muted);margin:.6rem 0 0}.eyebrow{font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--green);font-size:.75rem}h1{font:800 clamp(2.3rem,5vw,4.8rem)/.92 Georgia,serif;margin:.35rem 0}h2{font:800 1.25rem Georgia,serif;margin:.2rem 0 .8rem}h3{margin:.2rem 0 .5rem}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}.card{background:var(--card);border:1px solid var(--line);border-radius:1.25rem;padding:1.25rem;box-shadow:0 16px 38px #1b332012}.metric span{display:block;color:var(--muted);font-weight:750}.metric strong{display:block;font:800 clamp(1.8rem,4vw,2.8rem) Georgia,serif;margin-top:.45rem}.wide{grid-column:span 2}.full{grid-column:1/-1}.actions{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap}.text-link{color:var(--green);font-weight:850}.pill{display:inline-flex;align-items:center;padding:.28rem .6rem;border-radius:999px;background:#e2eee8;color:var(--green);font-weight:850;font-size:.78rem}.pill.fail{background:#f8dfda;color:var(--red)}.pill.external{background:#f7e8cc;color:var(--amber)}
    .command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.command-card{display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:start;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease}.command-card:hover{transform:translateY(-3px);box-shadow:0 22px 45px #1b332020}.command-icon{display:grid;place-items:center;width:3.25rem;height:3.25rem;border-radius:1rem;background:var(--lime);color:var(--ink)}.command-card p{color:var(--muted);margin:.4rem 0}.arrow{font-size:1.5rem;color:var(--green)}.aliases{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.8rem}.alias{background:#eeece4;border-radius:.45rem;padding:.25rem .45rem;color:var(--muted);font:750 .72rem ui-monospace,monospace}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:.85rem .55rem;border-bottom:1px solid var(--line);font-size:.88rem}th{color:var(--muted)}.warning{border-left:4px solid var(--amber);background:#fff6e5}.result{white-space:pre-wrap;overflow:auto;background:#14211d;color:#eaf4ec;padding:1rem;border-radius:.9rem;font:500 .82rem/1.5 ui-monospace,monospace}.back{display:inline-block;margin-bottom:1.5rem;color:var(--green);font-weight:850;text-decoration:none}.login{width:min(440px,calc(100% - 2rem));margin:12vh auto;background:var(--card);border:1px solid var(--line);border-radius:1.4rem;padding:clamp(1.4rem,5vw,2.4rem);box-shadow:0 25px 60px #1b33201f}.login label{display:grid;gap:.45rem;margin:1.2rem 0}.login input{font:inherit;padding:.9rem;border:1px solid var(--line);border-radius:.8rem;background:white}
    @media(max-width:900px){.layout{grid-template-columns:1fr}.rail{position:sticky;top:0;z-index:3;padding:.75rem 1rem;display:grid;grid-template-columns:auto 1fr auto;align-items:center;border-right:0;border-bottom:1px solid var(--line)}.brand small{display:none}.nav{display:flex;justify-content:center}.nav a{padding:.65rem}.nav span{display:none}.logout{margin:0}.logout button{padding:.65rem}.main{padding-top:1.5rem}.grid{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.top{align-items:flex-start;flex-direction:column}.grid,.command-grid{grid-template-columns:1fr}.wide{grid-column:auto}.command-card{grid-template-columns:auto 1fr}.arrow{display:none}table{display:block;overflow-x:auto}h1{font-size:2.6rem}}
  </style>
</head>
<body>${content}</body>
</html>`;
}

function navigation(active: DashboardSection) {
  const items: Array<{
    href: string;
    label: string;
    section: DashboardSection;
  }> = [
    { href: "/dashboard", label: "Overview", section: "overview" },
    { href: "/dashboard/commands", label: "Command hub", section: "commands" },
    { href: "/dashboard/activity", label: "Activity", section: "activity" },
  ];
  return `<aside class="rail">
    <a class="brand" href="/dashboard"><small>AKIPASA OS</small>Command Centre</a>
    <nav class="nav" aria-label="Automation dashboard">${items
      .map(
        (item) =>
          `<a href="${item.href}" aria-label="${escapeHtml(item.label)}"${
            active === item.section ? ' aria-current="page"' : ""
          }>${icon(item.section)}<span>${item.label}</span></a>`,
      )
      .join("")}</nav>
    <form class="logout" method="post" action="/dashboard/logout"><button type="submit">Sign out</button></form>
  </aside>`;
}

function shell(
  active: DashboardSection,
  title: string,
  introduction: string,
  content: string,
) {
  return `<div class="layout">${navigation(active)}<main class="main">
    <header class="top"><div><div class="eyebrow">AkiPasa automation</div><h1>${escapeHtml(
      title,
    )}</h1><p>${escapeHtml(introduction)}</p></div></header>
    ${content}
  </main></div>`;
}

function executionRows(data: DashboardData) {
  return data.executions.length
    ? data.executions
        .map(
          (item) => `<tr>
            <td>${escapeHtml(item.command)}</td>
            <td>${escapeHtml(item.caller)}</td>
            <td>${new Date(item.started_at).toLocaleString("en-GB")}</td>
            <td>${item.duration_ms ?? "-"} ms</td>
            <td><span class="pill ${item.success === 1 ? "" : "fail"}">${
              item.success === 1
                ? "Success"
                : item.success === 0
                  ? "Failed"
                  : "Running"
            }</span></td>
          </tr>`,
        )
        .join("")
    : '<tr><td colspan="5">No executions yet.</td></tr>';
}

export function loginHtml(error = false) {
  return page(
    `<main class="login">
      <div class="eyebrow">AkiPasa OS</div>
      <h1>Command Centre</h1>
      <p>Operator authentication is required.</p>
      ${error ? '<p class="pill fail">Access denied</p>' : ""}
      <form method="post" action="/dashboard/login">
        <label>Password<input type="password" name="password" required autocomplete="current-password"></label>
        <button class="button" type="submit">Open Command Centre</button>
      </form>
    </main>`,
    "AkiPasa Automation Login",
  );
}

export function dashboardHtml(
  data: DashboardData,
  appName: string,
  telegramConfigured: boolean,
) {
  return page(
    shell(
      "overview",
      "Automation pulse",
      `${appName} health and delivery performance at a glance.`,
      `<section class="grid">
        <article class="card metric"><span>Success rate</span><strong>${data.successRate}%</strong></article>
        <article class="card metric"><span>API latency</span><strong>${data.averageLatencyMs} ms</strong></article>
        <article class="card metric"><span>Pending jobs</span><strong>${data.pendingJobs}</strong></article>
        <article class="card metric"><span>Telegram</span><strong>${telegramConfigured ? "Ready" : "Setup"}</strong></article>
        <article class="card wide"><div class="eyebrow">Latest delivery</div><h2>Last report</h2><p>${
          data.lastReport
            ? `${escapeHtml(data.lastReport.report_type)} · ${new Date(
                data.lastReport.created_at,
              ).toLocaleString("en-GB")} · message ${escapeHtml(
                data.lastReport.telegram_message_id || "pending",
              )}`
            : "No report generated yet."
        }</p></article>
        <article class="card wide"><div class="eyebrow">Runtime</div><h2>Worker health</h2><p><span class="pill">Operational</span> D1 audit log connected.</p></article>
        <article class="card full"><div class="actions"><a class="button" href="/dashboard/commands">Open command hub</a><a class="text-link" href="/dashboard/activity">Review activity</a></div></article>
      </section>`,
    ),
    "AkiPasa Automation Dashboard",
  );
}

export function commandHubHtml(commands: CommandDescriptor[]) {
  const cards = commands
    .map(
      (
        command,
      ) => `<a class="card command-card" href="/dashboard/commands/${encodeURIComponent(
        command.name,
      )}">
        <span class="command-icon">${icon(command.icon)}</span>
        <span><span class="pill ${
          command.effect === "external" ? "external" : ""
        }">${escapeHtml(command.category)}</span><h2>${escapeHtml(
          command.name,
        )}</h2><p>${escapeHtml(command.description)}</p>
        <span class="aliases">${command.aliases
          .slice(0, 3)
          .map((alias) => `<span class="alias">${escapeHtml(alias)}</span>`)
          .join("")}</span></span><span class="arrow">→</span>
      </a>`,
    )
    .join("");
  return page(
    shell(
      "commands",
      "Command hub",
      "One secure surface for voice aliases, operator actions, and future automations.",
      `<section class="command-grid">${cards}</section>`,
    ),
    "AkiPasa Command Hub",
  );
}

export function commandDetailHtml(command: CommandDescriptor) {
  const external = command.effect === "external";
  const operationId = crypto.randomUUID();
  return page(
    shell(
      "commands",
      command.name,
      command.description,
      `<a class="back" href="/dashboard/commands">← All commands</a>
      <section class="grid">
        <article class="card wide"><div class="command-icon">${icon(
          command.icon,
        )}</div><h2>Command details</h2><p><span class="pill">${escapeHtml(
          command.category,
        )}</span> <span class="pill ${
          external ? "external" : ""
        }">${external ? "External action" : "Read only"}</span></p>
        <div class="aliases">${command.aliases
          .map((alias) => `<span class="alias">${escapeHtml(alias)}</span>`)
          .join("")}</div></article>
        <article class="card wide ${
          external ? "warning" : ""
        }"><h2>${external ? "Confirm delivery" : "Run check"}</h2><p>${
          external
            ? "This action contacts a configured external service and writes an audit record."
            : "This action reads current operational data and writes an audit record."
        }</p>
        <form method="post" action="/dashboard/commands/${encodeURIComponent(
          command.name,
        )}/run"><input type="hidden" name="confirmation" value="${escapeHtml(
          command.name,
        )}"><input type="hidden" name="operationId" value="${operationId}"><button class="button" type="submit">${
          external ? "Confirm and run" : "Run command"
        }</button></form></article>
      </section>`,
    ),
    `${command.name} | AkiPasa Command Hub`,
  );
}

export function commandResultHtml(
  command: CommandDescriptor,
  result: CommandResult | null,
  errorMessage?: string,
) {
  return page(
    shell(
      "commands",
      result ? "Command complete" : "Command failed",
      result?.summary || errorMessage || "The command could not be completed.",
      `<a class="back" href="/dashboard/commands/${encodeURIComponent(
        command.name,
      )}">← Back to ${escapeHtml(command.name)}</a>
      <article class="card ${result ? "" : "warning"}">
        <span class="pill ${result ? "" : "fail"}">${
          result ? "Success" : "Failed"
        }</span>
        <h2>${escapeHtml(command.name)}</h2>
        ${
          result?.data
            ? `<pre class="result">${escapeHtml(
                JSON.stringify(result.data, null, 2),
              )}</pre>`
            : "<p>No result data was returned.</p>"
        }
      </article>`,
    ),
    `${result ? "Complete" : "Failed"} | AkiPasa Command Hub`,
  );
}

export function activityHtml(data: DashboardData) {
  return page(
    shell(
      "activity",
      "Activity",
      "Audited voice and operator executions, newest first.",
      `<article class="card"><table><thead><tr><th>Command</th><th>Caller</th><th>Started</th><th>Latency</th><th>State</th></tr></thead><tbody>${executionRows(
        data,
      )}</tbody></table></article>`,
    ),
    "AkiPasa Automation Activity",
  );
}
