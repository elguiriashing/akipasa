#!/usr/bin/env node
/** PR gate: behavior changes need a reviewed master update and impact entry. */
import {execFileSync} from "node:child_process";
import fs from "node:fs";
const base=process.env.AKIPASA_BASE_SHA || process.env.GITHUB_BASE_SHA || "origin/master";
let changed;
try{changed=execFileSync("git",["diff","--name-only",base+"...HEAD"],{encoding:"utf8"}).trim().split("\n").filter(Boolean);}
catch(e){console.error("Cannot compare against base. Fetch the base branch or pass AKIPASA_BASE_SHA.",e.message);process.exit(2);}
const behavior=changed.some(f=>/^(src\/|database\/|automation\/|Android\/|wrangler\.jsonc$|next\.config|package(-lock)?\.json$|\.github\/workflows\/)/.test(f));
if(!behavior){console.log("Documentation-only PR: no behavior-change documentation gate.");process.exit(0);}
const required=["docs/AKIPASA_MASTER.md","docs/CHANGE_IMPACT_REGISTER.md"];
const missing=required.filter(f=>!changed.includes(f));
for(const file of required)if(!fs.existsSync(file))missing.push(file+" (file absent)");
if(missing.length){console.error("Behavior changed without contract/impact updates:",[...new Set(missing)].join(", "));process.exit(1);}
console.log("Change contract gate passed. HUMAN review must still confirm impact entry and regression evidence.");
