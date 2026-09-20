import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { organizers, registrations, workshops } from "@/db/schema";
import {
  getPublishedWorkshops as getExampleWorkshops,
  getWorkshopBySlug as getExampleWorkshopBySlug,
  type Workshop,
} from "@/lib/workshops";

const globalForPool = globalThis as typeof globalThis & { communityWorkshopsPool?: Pool };

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  const pool = globalForPool.communityWorkshopsPool ?? new Pool({
    connectionString,
    max: 5,
    allowExitOnIdle: true,
  });
  globalForPool.communityWorkshopsPool = pool;
  return drizzle({ client: pool });
}

async function selectPublishedWorkshops(slug?: string): Promise<Workshop[]> {
  const db = getDatabase();

  if (!db) {
    return slug
      ? [getExampleWorkshopBySlug(slug)].filter((workshop): workshop is Workshop => Boolean(workshop))
      : getExampleWorkshops();
  }

  const confirmedCounts = db
    .select({
      workshopId: registrations.workshopId,
      count: sql<number>`cast(count(*) as integer)`.as("confirmed_count"),
    })
    .from(registrations)
    .where(eq(registrations.status, "confirmed"))
    .groupBy(registrations.workshopId)
    .as("confirmed_counts");

  const rows = await db
    .select({
      workshop: workshops,
      organizerName: organizers.name,
      confirmedCount: sql<number>`coalesce(${confirmedCounts.count}, 0)`.mapWith(Number),
    })
    .from(workshops)
    .innerJoin(organizers, eq(workshops.organizerId, organizers.id))
    .leftJoin(confirmedCounts, eq(workshops.id, confirmedCounts.workshopId))
    .where(and(eq(workshops.status, "published"), slug ? eq(workshops.slug, slug) : undefined))
    .orderBy(asc(workshops.startsAt));

  return rows.map(({ workshop, organizerName, confirmedCount }) => ({
    slug: workshop.slug,
    title: workshop.title,
    summary: workshop.summary,
    description: workshop.description,
    category: workshop.category,
    startsAt: workshop.startsAt.toISOString(),
    endsAt: workshop.endsAt.toISOString(),
    timeZone: workshop.timeZone,
    venue: workshop.venue,
    address: workshop.address,
    organizer: organizerName,
    capacity: workshop.capacity,
    confirmedCount,
    learningPoints: workshop.learningPoints,
    isDemo: workshop.isDemo,
  }));
}

export async function getPublicWorkshops() {
  return {
    workshops: await selectPublishedWorkshops(),
    usingExampleData: !process.env.DATABASE_URL,
  };
}

export async function getPublicWorkshopBySlug(slug: string) {
  const workshops = await selectPublishedWorkshops(slug);
  return workshops[0];
}
