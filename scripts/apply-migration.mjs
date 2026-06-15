// Applies a SQL migration file to the Supabase database.
// Usage: node scripts/apply-migration.mjs supabase/migrations/20260612_worldwide_localization.sql
//
// Tries DATABASE_URL (direct connection) first; if that host doesn't resolve
// (direct hosts are IPv6-only / removed on paused projects), falls back to the
// Supavisor pooler by probing regions with the postgres.<ref> tenant username.

import { readFile } from "node:fs/promises";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

function parseEnvFile(input) {
  return Object.fromEntries(
    input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

const env = { ...parseEnvFile(await readFile(".env.local", "utf8").catch(() => "")), ...process.env };
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local / environment.");
  process.exit(1);
}

const direct = new URL(env.DATABASE_URL);
const ref = direct.hostname.startsWith("db.") ? direct.hostname.split(".")[1] : null;
const password = decodeURIComponent(direct.password);

const candidates = [env.DATABASE_URL];
if (ref) {
  const regions = [
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
    "eu-north-1", "us-east-1", "us-east-2", "us-west-1",
  ];
  for (const prefix of ["aws-0", "aws-1"]) {
    for (const region of regions) {
      candidates.push(
        `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${prefix}-${region}.pooler.supabase.com:5432/postgres`
      );
    }
  }
}

let sql = null;
for (const url of candidates) {
  const client = postgres(url, { ssl: "require", max: 1, connect_timeout: 8 });
  try {
    await client`select 1`;
    sql = client;
    console.log(`Connected via ${new URL(url).hostname}`);
    break;
  } catch (e) {
    await client.end({ timeout: 1 }).catch(() => {});
    if (url === env.DATABASE_URL) console.log(`Direct connection failed (${e.message.slice(0, 60)}), probing pooler…`);
  }
}
if (!sql) {
  console.error("Could not connect on any host. Is the Supabase project restored?");
  process.exit(1);
}

const migration = await readFile(file, "utf8");
try {
  await sql.unsafe(migration);
  console.log(`Applied ${file}`);
} finally {
  await sql.end();
}
