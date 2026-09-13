import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
);
try {
  await db.exec(
    readFileSync(
      "supabase/migrations/20260911212904_hardkick_core.sql",
      "utf8",
    ),
  );
  console.log("Migration executed successfully");
  console.log((await db.query("select * from public.hk_availability()")).rows);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
