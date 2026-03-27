/**
 * Runs every file in supabase/migrations/*.sql in lexical (timestamp) order.
 * Usage: node --env-file=.env scripts/apply-all-migrations.mjs
 *
 * Requires DATABASE_URL (Postgres URI from Supabase → Database settings).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL. Add it to .env and run:");
  console.error("  node --env-file=.env scripts/apply-all-migrations.mjs");
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No .sql files in supabase/migrations");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  for (const file of files) {
    const full = join(migrationsDir, file);
    const sql = readFileSync(full, "utf8");
    process.stdout.write(`Applying ${file}... `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("\nAll migrations applied.");
} finally {
  await client.end();
}
