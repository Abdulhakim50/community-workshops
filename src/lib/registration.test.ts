import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizers, registrations, workshops } from "@/db/schema";
import { registerAttendee } from "@/lib/registration";

describe("registration capacity", () => {
  const organizerId = randomUUID();
  const workshopId = randomUUID();

  beforeAll(async () => {
    const startsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    await db.insert(organizers).values({
      id: organizerId,
      name: "Registration Test Organizer",
      contactEmail: `registration-test-${organizerId}@example.test`,
    });
    await db.insert(workshops).values({
      id: workshopId,
      organizerId,
      slug: `registration-test-${workshopId}`,
      title: "Concurrent registration test",
      summary: "A workshop fixture for concurrent registrations.",
      description: "This database fixture verifies that simultaneous requests cannot exceed the workshop capacity.",
      category: "Testing",
      startsAt,
      endsAt,
      timeZone: "America/Los_Angeles",
      venue: "Test Room",
      address: "100 Test Street",
      capacity: 3,
      learningPoints: ["Test a transaction"],
      status: "published",
    });
  });

  afterAll(async () => {
    await db.delete(registrations).where(eq(registrations.workshopId, workshopId));
    await db.delete(workshops).where(eq(workshops.id, workshopId));
    await db.delete(organizers).where(eq(organizers.id, organizerId));
  });

  it("never confirms more simultaneous registrations than the seat limit", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) => registerAttendee({
        workshopId,
        attendeeName: `Concurrent Attendee ${index + 1}`,
        attendeeEmail: `concurrent-${index + 1}-${workshopId}@example.test`,
      })),
    );

    expect(results.filter((result) => result.outcome === "confirmed")).toHaveLength(3);
    expect(
      results
        .filter((result) => result.outcome === "waitlisted")
        .map((result) => result.outcome === "waitlisted" ? result.position : 0)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3, 4, 5]);

    const stored = await db
      .select({ status: registrations.status })
      .from(registrations)
      .where(eq(registrations.workshopId, workshopId));
    expect(stored.filter((registration) => registration.status === "confirmed")).toHaveLength(3);
  });

  it("normalizes email addresses and rejects an active duplicate", async () => {
    const email = `Duplicate-${workshopId}@Example.Test`;
    const first = await registerAttendee({ workshopId, attendeeName: "Duplicate Attendee", attendeeEmail: email });
    const duplicate = await registerAttendee({ workshopId, attendeeName: "Same Attendee", attendeeEmail: email.toLowerCase() });

    expect(first.outcome).toBe("waitlisted");
    expect(duplicate).toEqual({ outcome: "duplicate" });
  });
});
