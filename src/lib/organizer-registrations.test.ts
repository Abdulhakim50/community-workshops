import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organizers, registrations, workshops } from "@/db/schema";
import {
  getOrganizerWorkshopAttendees,
  setAttendeeCheckIn,
} from "@/lib/organizer-registrations";

describe("organizer attendee operations", () => {
  const organizerId = randomUUID();
  const otherOrganizerId = randomUUID();
  const workshopId = randomUUID();
  const confirmedId = randomUUID();
  const waitlistedId = randomUUID();
  const canceledId = randomUUID();

  beforeAll(async () => {
    const startsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await db.insert(organizers).values([
      {
        id: organizerId,
        name: "Attendance Test Organizer",
        contactEmail: `attendance-test-${organizerId}@example.test`,
      },
      {
        id: otherOrganizerId,
        name: "Other Attendance Organizer",
        contactEmail: `attendance-other-${otherOrganizerId}@example.test`,
      },
    ]);
    await db.insert(workshops).values({
      id: workshopId,
      organizerId,
      slug: `attendance-test-${workshopId}`,
      title: "Attendance operations test",
      summary: "A workshop fixture for organizer attendance operations.",
      description: "This database fixture verifies attendee visibility, counts, ordering, ownership, and check-in controls.",
      category: "Testing",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      timeZone: "America/Los_Angeles",
      venue: "Test Room",
      address: "100 Test Street",
      capacity: 1,
      learningPoints: ["Test organizer operations"],
      status: "published",
    });
    await db.insert(registrations).values([
      {
        id: confirmedId,
        workshopId,
        attendeeName: "Confirmed Person",
        attendeeEmail: `confirmed-${workshopId}@example.test`,
        status: "confirmed",
        registeredAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        id: waitlistedId,
        workshopId,
        attendeeName: "Waiting Person",
        attendeeEmail: `waiting-${workshopId}@example.test`,
        status: "waitlisted",
        registeredAt: new Date("2026-01-01T10:01:00Z"),
      },
      {
        id: canceledId,
        workshopId,
        attendeeName: "Canceled Person",
        attendeeEmail: `canceled-${workshopId}@example.test`,
        status: "canceled",
        registeredAt: new Date("2026-01-01T09:59:00Z"),
        canceledAt: new Date("2026-01-02T10:00:00Z"),
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(registrations).where(eq(registrations.workshopId, workshopId));
    await db.delete(workshops).where(eq(workshops.id, workshopId));
    await db.delete(organizers).where(inArray(organizers.id, [organizerId, otherOrganizerId]));
  });

  it("returns ordered attendee groups and counts only to the owning organizer", async () => {
    const data = await getOrganizerWorkshopAttendees(organizerId, workshopId);
    expect(data?.counts).toEqual({ confirmed: 1, checkedIn: 0, waitlisted: 1, canceled: 1 });
    expect(data?.confirmed.map((attendee) => attendee.id)).toEqual([confirmedId]);
    expect(data?.waitlisted.map((attendee) => attendee.id)).toEqual([waitlistedId]);
    expect(data?.canceled.map((attendee) => attendee.id)).toEqual([canceledId]);

    await expect(getOrganizerWorkshopAttendees(otherOrganizerId, workshopId)).resolves.toBeUndefined();
  });

  it("checks in confirmed attendees while rejecting another organizer and waitlisted registrations", async () => {
    await expect(setAttendeeCheckIn({
      organizerId: otherOrganizerId,
      workshopId,
      registrationId: confirmedId,
      checkedIn: true,
    })).resolves.toBe(false);
    await expect(setAttendeeCheckIn({
      organizerId,
      workshopId,
      registrationId: waitlistedId,
      checkedIn: true,
    })).resolves.toBe(false);
    await expect(setAttendeeCheckIn({
      organizerId,
      workshopId,
      registrationId: confirmedId,
      checkedIn: true,
    })).resolves.toBe(true);

    const checkedIn = await getOrganizerWorkshopAttendees(organizerId, workshopId);
    expect(checkedIn?.counts.checkedIn).toBe(1);
    expect(checkedIn?.confirmed[0].checkedInAt).toBeInstanceOf(Date);

    await expect(setAttendeeCheckIn({
      organizerId,
      workshopId,
      registrationId: confirmedId,
      checkedIn: false,
    })).resolves.toBe(true);
    const undone = await getOrganizerWorkshopAttendees(organizerId, workshopId);
    expect(undone?.counts.checkedIn).toBe(0);
    expect(undone?.confirmed[0].checkedInAt).toBeNull();
  });
});
