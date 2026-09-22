import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizers, registrations, workshops } from "@/db/schema";
import { cancelRegistration, registerAttendee } from "@/lib/registration";

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

describe("cancellation and waitlist promotion", () => {
  const organizerId = randomUUID();
  const orderedWorkshopId = randomUUID();
  const concurrentWorkshopId = randomUUID();

  beforeAll(async () => {
    const startsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    await db.insert(organizers).values({
      id: organizerId,
      name: "Cancellation Test Organizer",
      contactEmail: `cancellation-test-${organizerId}@example.test`,
    });
    await db.insert(workshops).values([
      {
        id: orderedWorkshopId,
        organizerId,
        slug: `ordered-promotion-test-${orderedWorkshopId}`,
        title: "Ordered promotion test",
        summary: "A workshop fixture for ordered waitlist promotion.",
        description: "This database fixture verifies that the earliest waitlisted attendee receives an open seat.",
        category: "Testing",
        startsAt,
        endsAt,
        timeZone: "America/Los_Angeles",
        venue: "Test Room",
        address: "100 Test Street",
        capacity: 1,
        learningPoints: ["Test ordered promotion"],
        status: "published" as const,
      },
      {
        id: concurrentWorkshopId,
        organizerId,
        slug: `concurrent-cancellation-test-${concurrentWorkshopId}`,
        title: "Concurrent cancellation test",
        summary: "A workshop fixture for concurrent cancellations.",
        description: "This database fixture verifies that simultaneous cancellations promote the correct number of attendees.",
        category: "Testing",
        startsAt,
        endsAt,
        timeZone: "America/Los_Angeles",
        venue: "Test Room",
        address: "100 Test Street",
        capacity: 2,
        learningPoints: ["Test concurrent cancellation"],
        status: "published" as const,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(registrations).where(eq(registrations.workshopId, orderedWorkshopId));
    await db.delete(registrations).where(eq(registrations.workshopId, concurrentWorkshopId));
    await db.delete(workshops).where(eq(workshops.id, orderedWorkshopId));
    await db.delete(workshops).where(eq(workshops.id, concurrentWorkshopId));
    await db.delete(organizers).where(eq(organizers.id, organizerId));
  });

  it("promotes waitlisted attendees in registration order and rejects token reuse", async () => {
    const first = await registerAttendee({ workshopId: orderedWorkshopId, attendeeName: "Confirmed", attendeeEmail: `confirmed-${orderedWorkshopId}@example.test` });
    const second = await registerAttendee({ workshopId: orderedWorkshopId, attendeeName: "First Waiting", attendeeEmail: `first-waiting-${orderedWorkshopId}@example.test` });
    const third = await registerAttendee({ workshopId: orderedWorkshopId, attendeeName: "Second Waiting", attendeeEmail: `second-waiting-${orderedWorkshopId}@example.test` });
    if (first.outcome !== "confirmed" || second.outcome !== "waitlisted" || third.outcome !== "waitlisted") {
      throw new Error("Unexpected registration setup result");
    }

    const cancellation = await cancelRegistration(first.cancellationToken);
    expect(cancellation.outcome).toBe("canceled");
    if (cancellation.outcome !== "canceled") throw new Error("Expected cancellation result");
    expect(cancellation.promotion).toMatchObject({
      registrationId: second.registrationId,
      cancellationToken: second.cancellationToken,
      attendeeName: "First Waiting",
      attendeeEmail: `first-waiting-${orderedWorkshopId}@example.test`,
    });
    expect(await cancelRegistration(first.cancellationToken)).toEqual({ outcome: "unavailable" });

    const stored = await db
      .select({ attendeeName: registrations.attendeeName, status: registrations.status })
      .from(registrations)
      .where(eq(registrations.workshopId, orderedWorkshopId));
    expect(stored.find((row) => row.attendeeName === "First Waiting")?.status).toBe("confirmed");
    expect(stored.find((row) => row.attendeeName === "Second Waiting")?.status).toBe("waitlisted");
  });

  it("serializes simultaneous cancellations and promotes exactly enough people", async () => {
    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await registerAttendee({
        workshopId: concurrentWorkshopId,
        attendeeName: `Concurrent Cancellation ${index + 1}`,
        attendeeEmail: `concurrent-cancellation-${index + 1}-${concurrentWorkshopId}@example.test`,
      }));
    }
    const confirmed = results.filter((result) => result.outcome === "confirmed");
    expect(confirmed).toHaveLength(2);

    await Promise.all(confirmed.map((result) =>
      result.outcome === "confirmed" ? cancelRegistration(result.cancellationToken) : undefined,
    ));

    const stored = await db
      .select({ status: registrations.status })
      .from(registrations)
      .where(eq(registrations.workshopId, concurrentWorkshopId));
    expect(stored.filter((row) => row.status === "confirmed")).toHaveLength(2);
    expect(stored.filter((row) => row.status === "waitlisted")).toHaveLength(0);
    expect(stored.filter((row) => row.status === "canceled")).toHaveLength(2);
  });
});
