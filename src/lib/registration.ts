import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations, workshops } from "@/db/schema";

export type RegistrationResult =
  | { outcome: "confirmed" }
  | { outcome: "waitlisted"; position: number }
  | { outcome: "duplicate" }
  | { outcome: "unavailable" };

export async function registerAttendee(input: {
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
}): Promise<RegistrationResult> {
  const attendeeEmail = input.attendeeEmail.trim().toLowerCase();

  try {
    return await db.transaction(async (tx) => {
      // Every registration for one workshop takes the same row lock. This makes
      // the capacity check and insert one serialized operation under concurrency.
      const [workshop] = await tx
        .select({
          id: workshops.id,
          capacity: workshops.capacity,
          startsAt: workshops.startsAt,
          isDemo: workshops.isDemo,
        })
        .from(workshops)
        .where(and(eq(workshops.id, input.workshopId), eq(workshops.status, "published")))
        .for("update");

      if (!workshop || workshop.isDemo || workshop.startsAt <= new Date()) {
        return { outcome: "unavailable" };
      }

      const [existing] = await tx
        .select({ id: registrations.id })
        .from(registrations)
        .where(and(
          eq(registrations.workshopId, workshop.id),
          eq(registrations.attendeeEmail, attendeeEmail),
          ne(registrations.status, "canceled"),
        ))
        .limit(1);

      if (existing) return { outcome: "duplicate" };

      const [counts] = await tx
        .select({
          confirmed: sql<number>`cast(count(*) filter (where ${registrations.status} = 'confirmed') as integer)`.mapWith(Number),
          waitlisted: sql<number>`cast(count(*) filter (where ${registrations.status} = 'waitlisted') as integer)`.mapWith(Number),
        })
        .from(registrations)
        .where(eq(registrations.workshopId, workshop.id));

      const isConfirmed = counts.confirmed < workshop.capacity;
      await tx.insert(registrations).values({
        workshopId: workshop.id,
        attendeeName: input.attendeeName.trim(),
        attendeeEmail,
        status: isConfirmed ? "confirmed" : "waitlisted",
      });

      return isConfirmed
        ? { outcome: "confirmed" }
        : { outcome: "waitlisted", position: counts.waitlisted + 1 };
    });
  } catch (error) {
    // The partial unique index is a final guard if an active duplicate exists.
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return { outcome: "duplicate" };
    }
    throw error;
  }
}
