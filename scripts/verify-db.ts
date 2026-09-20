import assert from "node:assert/strict";
import { config } from "dotenv";
import { Pool } from "pg";
import { getPublicWorkshopBySlug, getPublicWorkshops } from "../src/lib/public-workshops";

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
    demo: string;
  }>(`
    SELECT
      (SELECT count(*) FROM organizers) AS organizers,
      (SELECT count(*) FROM workshops) AS workshops,
      (SELECT count(*) FROM registrations) AS registrations,
      (SELECT count(*) FROM workshops WHERE status = 'published') AS published,
      (SELECT count(*) FROM workshops WHERE is_demo) AS demo
  `);

  const counts = result.rows[0];
  assert.equal(Number(counts.organizers), 1);
  assert.equal(Number(counts.workshops), 3);
  assert.equal(Number(counts.registrations), 27);
  assert.equal(Number(counts.published), 3);
  assert.equal(Number(counts.demo), 3);

  const publicResult = await getPublicWorkshops();
  assert.equal(publicResult.usingExampleData, false);
  assert.deepEqual(
    publicResult.workshops.map((workshop) => [workshop.slug, workshop.confirmedCount]),
    [
      ["urban-gardening-basics", 7],
      ["printmaking-with-everyday-materials", 16],
      ["repair-your-favorite-clothes", 4],
    ],
  );
  assert.equal(await getPublicWorkshopBySlug("missing-workshop"), undefined);

  const databaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const exampleResult = await getPublicWorkshops();
    assert.equal(exampleResult.usingExampleData, true);
    assert.equal(exampleResult.workshops.length, 3);
  } finally {
    process.env.DATABASE_URL = databaseUrl;
  }

  console.log("Database queries verified: 3 published demo workshops with confirmed counts 7, 16, and 4.");
}

verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
