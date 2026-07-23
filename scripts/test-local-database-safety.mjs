import assert from "node:assert/strict";
import { requireLocalDatabaseUrl } from "./lib/local-database-safety.mjs";

for (const value of [
  "postgresql://postgres:postgres@localhost:54322/postgres",
  "postgres://postgres:postgres@127.0.0.1:54322/akipasa",
  "postgresql://postgres:postgres@[::1]:54322/postgres",
]) {
  assert.doesNotThrow(() => requireLocalDatabaseUrl(value));
}

for (const value of [
  undefined,
  "not-a-url",
  "https://localhost/database",
  "postgresql://postgres@example.com/production",
  "postgresql://postgres@db.example.supabase.co/postgres",
  "postgresql://postgres@localhost",
]) {
  assert.throws(() => requireLocalDatabaseUrl(value));
}

console.log("Local database safety checks passed.");
