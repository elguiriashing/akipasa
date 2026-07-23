import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { requireLocalDatabaseUrl } from "./lib/local-database-safety.mjs";

const operation = process.argv[2];
if (!["seed", "reset"].includes(operation)) {
  throw new Error("Usage: node scripts/local-database.mjs <seed|reset>");
}

const databaseUrl = requireLocalDatabaseUrl(
  process.env.AKIPASA_LOCAL_DATABASE_URL,
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlFile = path.join(
  root,
  "database",
  "seeds",
  operation === "seed" ? "seed.sql" : "reset.sql",
);
const sql = postgres(databaseUrl.toString(), {
  max: 1,
  connect_timeout: 5,
  idle_timeout: 1,
});

try {
  await sql.file(sqlFile);
  console.log(`Local AkiPasa ${operation} completed.`);
} finally {
  await sql.end({ timeout: 1 });
}
