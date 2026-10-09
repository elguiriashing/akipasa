#!/usr/bin/env node
/**
 * Deterministic, dependency-free source inventory. No code execution, API calls,
 * secrets, or production data access. Regex extraction is a DISCOVERY AID,
 * not an AST parser or proof that every button is reachable.
 */
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const targets=["src/app","src/components","src/lib","database/migrations","tests","automation/src","Android"];
const exclude=new Set(["node_modules",".next",".open-next",".git","dist","build",".gradle","coverage"]);
const files=[];
function walk(dir){
 if(!fs.existsSync(dir)) return;
 for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  if(exclude.has(ent.name))continue;
  const full=path.join(dir,ent.name);
  if(ent.isDirectory())walk(full); else if(ent.isFile())files.push(path.relative(root,full).replaceAll(path.sep,"/"));
 }
}
for(const dir of targets)walk(path.join(root,dir));
const extensions=/\.(tsx?|jsx?|sql|kt|kts)$/;
const filtered=files.filter(f=>extensions.test(f));
const result={schemaVersion:1,notice:"Static discovery only; verify runtime, permissions and dynamic routes manually.",counts:{files:filtered.length},routes:[],controls:[],endpoints:[],migrations:[],tests:[],integrations:[]};
const limit=1000000;
for(const file of filtered){
 const src=fs.readFileSync(path.join(root,file),"utf8").slice(0,limit);
 const matches=(regex)=>[...src.matchAll(regex)].map(m=>({line:src.slice(0,m.index).split("\n").length,value:m[0].slice(0,150)}));
 if(file.startsWith("src/app/")){
  if(/\/(page|route|layout|loading|error|not-found)\.(tsx?|jsx?)$/.test(file))result.routes.push({file,kind:path.basename(file).split(".")[0],route:"/"+file.replace(/^src\/app\//,"").replace(/\/(page|route|layout|loading|error|not-found)\.(tsx?|jsx?)$/,"").replace(/\(.*?\)\//g,"").replace(/\/$/,"")});
  if(/\/route\.(tsx?|jsx?)$/.test(file))result.endpoints.push({file,methods:[...src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)].map(x=>x[1])});
 }
 if(file.startsWith("database/migrations/"))result.migrations.push(file);
 if(file.startsWith("tests/"))result.tests.push(file);
 if(/\.(tsx|jsx)$/.test(file)){
  const tags=matches(/<(button|a|input|select|textarea)\b/g);
  const handlers=matches(/\bon(?:Click|Submit|Change|KeyDown|PointerDown|TouchStart)\s*=/g);
  const labels=matches(/\b(?:aria-label|title|placeholder)\s*=/g);
  if(tags.length||handlers.length||labels.length)result.controls.push({file,tags,handlers,labels});
 }
 const refs=[...new Set([...src.matchAll(/\b(?:stripe|supabase|google|gtag|maplibre|cloudflare|resend|translate|analytics|consent|akihq|akiduermo)\b/gi)].map(m=>m[0].toLowerCase()))].sort();
 if(refs.length)result.integrations.push({file,refs});
}
result.counts.routes=result.routes.length;result.counts.controlFiles=result.controls.length;
result.counts.endpoints=result.endpoints.length;result.counts.migrations=result.migrations.length;result.counts.tests=result.tests.length;
for(const key of ["routes","controls","endpoints","migrations","tests","integrations"])result[key].sort((a,b)=>String(typeof a==="string"?a:a.file).localeCompare(String(typeof b==="string"?b:b.file)));
if(process.argv.includes("--summary")){
 console.log(JSON.stringify({counts:result.counts,routes:result.routes,endpoints:result.endpoints},null,2));
}else console.log(JSON.stringify(result,null,2));
