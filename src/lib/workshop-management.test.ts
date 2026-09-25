import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizers, registrations, workshops } from "@/db/schema";
import { cancelRegistration, registerAttendee } from "@/lib/registration";
import { updateOrganizerWorkshop } from "@/lib/workshop-management";

let organizerId: string;
let workshopId: string;
const changes = {
  title: "Capacity safety workshop",
  summary: "Testing safe capacity edits.",
  description: "A fixture for verifying capacity edits alongside new registrations.",
  category: "Testing",
  startsAt: new Date(Date.now() + 86_400_000 * 365),
  endsAt: new Date(Date.now() + 86_400_000 * 365 + 7_200_000),
  timeZone: "UTC",
  venue: "Test room",
  address: "100 Test Street",
  learningPoints: ["Safe capacity changes"],
  capacity: 3,
};

beforeEach(async () => {
  organizerId = randomUUID();
  workshopId = randomUUID();
  await db.insert(organizers).values({ id: organizerId, name: "Capacity Tester", contactEmail: `${organizerId}@example.test` });
  await db.insert(workshops).values({ ...changes, id: workshopId, organizerId, slug: `capacity-${workshopId}`, status: "published" });
});

afterEach(async () => {
  await db.delete(registrations).where(eq(registrations.workshopId, workshopId));
  await db.delete(workshops).where(eq(workshops.id, workshopId));
  await db.delete(organizers).where(eq(organizers.id, organizerId));
});

async function addAttendee() {
  return registerAttendee({ workshopId, attendeeName: "Test Attendee", attendeeEmail: `${randomUUID()}@example.test` });
}

it("rejects the entire edit below confirmed attendance and allows the exact minimum", async () => {
  await addAttendee();
  await addAttendee();
  expect(await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 1, title: "Rejected title" }))
    .toEqual({ outcome: "below-confirmed", confirmedCount: 2 });
  const [stored] = await db.select().from(workshops).where(eq(workshops.id, workshopId));
  expect(stored.capacity).toBe(3);
  expect(stored.title).toBe(changes.title);
  expect(stored.updatedAt).toEqual(stored.createdAt);
  expect(await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 2 }))
    .toMatchObject({ outcome: "updated" });
});

it("does not count canceled or waitlisted registrations as occupied seats", async () => {
  await db.insert(registrations).values(["confirmed", "waitlisted", "canceled"].map((status) => ({
    workshopId, attendeeName: "Fixture", attendeeEmail: `${randomUUID()}@example.test`,
    status: status as "confirmed" | "waitlisted" | "canceled",
  })));
  expect(await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 1 }))
    .toMatchObject({ outcome: "updated" });
});

it("rejects edits by another organizer and edits to canceled workshops", async () => {
  expect(await updateOrganizerWorkshop(randomUUID(), workshopId, changes)).toEqual({ outcome: "unavailable" });
  await db.update(workshops).set({ status: "canceled" }).where(eq(workshops.id, workshopId));
  expect(await updateOrganizerWorkshop(organizerId, workshopId, changes)).toEqual({ outcome: "unavailable" });
});

it("keeps capacity valid when reductions race with new registrations", async () => {
  await addAttendee();
  const [edit] = await Promise.all([
    updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 1 }),
    ...Array.from({ length: 8 }, () => addAttendee()),
  ]);
  const [stored] = await db.select().from(workshops).where(eq(workshops.id, workshopId));
  const attendees = await db.select().from(registrations).where(eq(registrations.workshopId, workshopId));
  const confirmed = attendees.filter((attendee) => attendee.status === "confirmed").length;
  expect(confirmed).toBeLessThanOrEqual(stored.capacity);
  expect(attendees).toHaveLength(9);
  expect(stored.capacity).toBe(edit.outcome === "updated" ? 1 : 3);
  expect(["updated", "below-confirmed"]).toContain(edit.outcome);
});

async function fillAndWait() {
  for (let index = 0; index < 3; index += 1) await addAttendee();
  const waiting = [];
  for (let index = 0; index < 3; index += 1) {
    const result = await addAttendee();
    if (result.outcome !== "waitlisted") throw new Error("Expected waitlisted fixture");
    // Explicit timestamps ensure queue ordering does not depend on test speed.
    await db.update(registrations).set({ registeredAt: new Date(1_000 + index * 1_000) })
      .where(eq(registrations.id, result.registrationId));
    waiting.push(result);
  }
  return waiting;
}

it("promotes in queue order, skips canceled entries, and preserves private links", async () => {
  const waiting = await fillAndWait();
  await cancelRegistration(waiting[1].cancellationToken);
  const result = await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 5, venue: "New venue" });
  expect(result.outcome).toBe("updated");
  if (result.outcome !== "updated") throw new Error("Expected update");
  expect(result.promotions.map((promotion) => promotion.registrationId)).toEqual([waiting[0].registrationId, waiting[2].registrationId]);
  expect(result.promotions[0].cancellationToken).toBe(waiting[0].cancellationToken);
  expect(result.promotions[0].workshop.venue).toBe("New venue");
  const attendees = await db.select().from(registrations).where(eq(registrations.workshopId, workshopId));
  expect(attendees.filter((attendee) => attendee.status === "confirmed")).toHaveLength(5);
  const repeated = await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 5 });
  expect(repeated).toMatchObject({ outcome: "updated", promotions: [] });
});

it("gives existing waitlisted attendees priority during simultaneous saves and bookings", async () => {
  const waiting = await fillAndWait();
  const results = await Promise.all([
    updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 5 }),
    updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 5 }),
    addAttendee(),
  ]);
  const promoted = results.flatMap((result) => result.outcome === "updated" ? result.promotions : []);
  expect(promoted.map((attendee) => attendee.registrationId)).toEqual(waiting.slice(0, 2).map((attendee) => attendee.registrationId));
  expect(results[2].outcome).toBe("waitlisted");
  const attendees = await db.select().from(registrations).where(eq(registrations.workshopId, workshopId));
  expect(attendees.filter((attendee) => attendee.status === "confirmed")).toHaveLength(5);
  expect(attendees.find((attendee) => attendee.id === waiting[2].registrationId)?.status).toBe("waitlisted");
});

it("leaves extra seats open when the waitlist is shorter than the increase", async () => {
  await fillAndWait();
  const result = await updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 10 });
  expect(result.outcome).toBe("updated");
  if (result.outcome !== "updated") throw new Error("Expected update");
  expect(result.promotions).toHaveLength(3);
  expect((await addAttendee()).outcome).toBe("confirmed");
});

it.each(["draft", "demo", "started"])("does not promote for a %s workshop", async (state) => {
  await fillAndWait();
  if (state === "draft") await db.update(workshops).set({ status: "draft" }).where(eq(workshops.id, workshopId));
  if (state === "demo") await db.update(workshops).set({ isDemo: true }).where(eq(workshops.id, workshopId));
  const result = await updateOrganizerWorkshop(organizerId, workshopId, {
    ...changes, capacity: 5,
    startsAt: state === "started" ? new Date(Date.now() - 60_000) : changes.startsAt,
  });
  expect(result).toMatchObject({ outcome: "updated", promotions: [] });
  const attendees = await db.select().from(registrations).where(eq(registrations.workshopId, workshopId));
  expect(attendees.filter((attendee) => attendee.status === "waitlisted")).toHaveLength(3);
});
