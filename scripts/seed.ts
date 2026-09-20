import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { organizers, registrations, workshops } from "../src/db/schema";
import { getPublishedWorkshops } from "../src/lib/workshops";

config({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL in .env.local before seeding the database.");
}

const pool = new Pool({ connectionString });
const db = drizzle({ client: pool });

async function seed() {
  await db.transaction(async (tx) => {
    const contactEmail = "organizer@example.test";
    const insertedOrganizer = await tx
      .insert(organizers)
      .values({ name: "Neighborhood Learning Circle", contactEmail })
      .onConflictDoNothing()
      .returning({ id: organizers.id });

    const organizer = insertedOrganizer[0] ??
      (await tx.select({ id: organizers.id }).from(organizers).where(eq(organizers.contactEmail, contactEmail)))[0];

    if (!organizer) {
      throw new Error("Could not find the example organizer.");
    }

    for (const example of getPublishedWorkshops()) {
      const insertedWorkshop = await tx
        .insert(workshops)
        .values({
          organizerId: organizer.id,
          slug: example.slug,
          title: example.title,
          summary: example.summary,
          description: example.description,
          category: example.category,
          startsAt: new Date(example.startsAt),
          endsAt: new Date(example.endsAt),
          timeZone: example.timeZone,
          venue: example.venue,
          address: example.address,
          capacity: example.capacity,
          learningPoints: example.learningPoints,
          status: "published",
        })
        .onConflictDoNothing()
        .returning({ id: workshops.id });

      const workshop = insertedWorkshop[0] ??
        (await tx.select({ id: workshops.id }).from(workshops).where(eq(workshops.slug, example.slug)))[0];

      if (!workshop) {
        throw new Error(`Could not find example workshop ${example.slug}.`);
      }

      if (example.confirmedCount > 0) {
        await tx.insert(registrations).values(
          Array.from({ length: example.confirmedCount }, (_, index) => ({
            workshopId: workshop.id,
            attendeeName: `Example Attendee ${index + 1}`,
            attendeeEmail: `attendee-${example.slug}-${index + 1}@example.test`,
            status: "confirmed" as const,
          })),
        ).onConflictDoNothing();
      }
    }
  });

  console.log("Example organizer, workshops, and registrations are present.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
