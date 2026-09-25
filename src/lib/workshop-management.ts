import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations, workshops } from "@/db/schema";
import type { parseWorkshopForm } from "@/lib/workshop-form";
import { createCancellationToken, type PromotionNotificationDetails } from "@/lib/registration";
import { canAcceptAttendees } from "@/lib/workshop-eligibility";

type WorkshopChanges = Extract<ReturnType<typeof parseWorkshopForm>, { success: true }>["data"];

export async function updateOrganizerWorkshop(
  organizerId: string,
  workshopId: string,
  changes: WorkshopChanges,
) {
  return db.transaction(async (tx) => {
    // Registration and cancellation lock this same row before changing seats.
    // Count only after acquiring it, so an intervening booking cannot be missed.
    const [workshop] = await tx.select({ id: workshops.id, slug: workshops.slug, capacity: workshops.capacity, status: workshops.status, isDemo: workshops.isDemo })
      .from(workshops)
      .where(and(
        eq(workshops.id, workshopId),
        eq(workshops.organizerId, organizerId),
        ne(workshops.status, "canceled"),
      ))
      .for("update");

    if (!workshop) return { outcome: "unavailable" as const };

    const [counts] = await tx.select({ count: sql<number>`cast(count(*) as integer)`.mapWith(Number) })
      .from(registrations)
      .where(and(eq(registrations.workshopId, workshopId), eq(registrations.status, "confirmed")));

    if (changes.capacity < counts.count) {
      return { outcome: "below-confirmed" as const, confirmedCount: counts.count };
    }

    await tx.update(workshops).set({ ...changes, updatedAt: new Date() })
      .where(eq(workshops.id, workshop.id));

    const promotions: PromotionNotificationDetails[] = [];
    if (changes.capacity > workshop.capacity && canAcceptAttendees({ ...workshop, startsAt: changes.startsAt })) {
      const waiting = await tx.select().from(registrations)
        .where(and(eq(registrations.workshopId, workshop.id), eq(registrations.status, "waitlisted")))
        .orderBy(asc(registrations.registeredAt), asc(registrations.id))
        .limit(changes.capacity - counts.count);

      if (waiting.length > 0) {
        await tx.update(registrations).set({ status: "confirmed" })
          .where(inArray(registrations.id, waiting.map((attendee) => attendee.id)));
        for (const attendee of waiting) {
          promotions.push({
            registrationId: attendee.id,
            cancellationToken: createCancellationToken(attendee.id),
            attendeeName: attendee.attendeeName,
            attendeeEmail: attendee.attendeeEmail,
            workshop: {
              title: changes.title, slug: workshop.slug,
              startsAt: changes.startsAt, endsAt: changes.endsAt,
              timeZone: changes.timeZone, venue: changes.venue, address: changes.address,
            },
          });
        }
      }
    }
    return { outcome: "updated" as const, id: workshop.id, slug: workshop.slug, promotions };
  });
}
