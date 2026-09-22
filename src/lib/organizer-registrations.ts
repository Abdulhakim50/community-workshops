import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations, workshops } from "@/db/schema";

export async function getOrganizerWorkshopAttendees(
  organizerId: string,
  workshopId: string,
) {
  const [workshop] = await db
    .select({
      id: workshops.id,
      title: workshops.title,
      capacity: workshops.capacity,
      startsAt: workshops.startsAt,
      timeZone: workshops.timeZone,
      status: workshops.status,
    })
    .from(workshops)
    .where(and(
      eq(workshops.id, workshopId),
      eq(workshops.organizerId, organizerId),
    ))
    .limit(1);

  if (!workshop) return undefined;

  const attendeeRows = await db
    .select({
      id: registrations.id,
      attendeeName: registrations.attendeeName,
      attendeeEmail: registrations.attendeeEmail,
      status: registrations.status,
      registeredAt: registrations.registeredAt,
      canceledAt: registrations.canceledAt,
      checkedInAt: registrations.checkedInAt,
    })
    .from(registrations)
    .where(eq(registrations.workshopId, workshopId))
    .orderBy(asc(registrations.registeredAt), asc(registrations.id));

  const confirmed = attendeeRows.filter((attendee) => attendee.status === "confirmed");
  const waitlisted = attendeeRows.filter((attendee) => attendee.status === "waitlisted");
  const canceled = attendeeRows.filter((attendee) => attendee.status === "canceled");

  return {
    workshop,
    confirmed,
    waitlisted,
    canceled,
    counts: {
      confirmed: confirmed.length,
      checkedIn: confirmed.filter((attendee) => attendee.checkedInAt).length,
      waitlisted: waitlisted.length,
      canceled: canceled.length,
    },
  };
}

export async function setAttendeeCheckIn(input: {
  organizerId: string;
  workshopId: string;
  registrationId: string;
  checkedIn: boolean;
}) {
  const [ownedWorkshop] = await db
    .select({ id: workshops.id })
    .from(workshops)
    .where(and(
      eq(workshops.id, input.workshopId),
      eq(workshops.organizerId, input.organizerId),
    ))
    .limit(1);

  if (!ownedWorkshop) return false;

  const [updated] = await db
    .update(registrations)
    .set({ checkedInAt: input.checkedIn ? new Date() : null })
    .where(and(
      eq(registrations.id, input.registrationId),
      eq(registrations.workshopId, input.workshopId),
      eq(registrations.status, "confirmed"),
    ))
    .returning({ id: registrations.id });

  return Boolean(updated);
}
