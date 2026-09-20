import assert from "node:assert/strict";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to verify the database.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  const result = await pool.query<{
    organizers: string;
    workshops: string;
    registrations: string;
    published: string;
  }>(`
    SELECT
      (SELECT count(*) FROM organizers) AS organizers,
      (SELECT count(*) FROM workshops) AS workshops,
      (SELECT count(*) FROM registrations) AS registrations,
      (SELECT count(*) FROM workshops WHERE status = 'published') AS published
  `);

  const counts = result.rows[0];
  assert.equal(Number(counts.organizers), 1);
  assert.equal(Number(counts.workshops), 3);
  assert.equal(Number(counts.registrations), 27);
  assert.equal(Number(counts.published), 3);
  console.log("Database migration and repeatable seed verified: 1 organizer, 3 workshops, 27 registrations.");
}

verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
