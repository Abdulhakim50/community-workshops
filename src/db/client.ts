import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDatabase = globalThis as typeof globalThis & {
  communityWorkshopsPool?: Pool;
};

const pool = globalForDatabase.communityWorkshopsPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  allowExitOnIdle: true,
});

globalForDatabase.communityWorkshopsPool = pool;

export const db = drizzle({ client: pool });
