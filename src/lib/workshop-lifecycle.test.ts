import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizers, registrations, workshops } from "@/db/schema";
import { cancelRegistration, registerAttendee } from "@/lib/registration";
import { updateOrganizerWorkshop } from "@/lib/workshop-management";
import { canAcceptAttendees } from "@/lib/workshop-eligibility";

let organizerId: string;
let workshopId: string;
const changes = {
  title: "Lifecycle test", summary: "Workshop cutoff tests",
  description: "Verifies workshop cutoffs while database operations are serialized.",
  category: "Testing", startsAt: new Date(Date.now() + 86_400_000),
  endsAt: new Date(Date.now() + 90_000_000), timeZone: "UTC",
  venue: "Test Room", address: "100 Test Street", capacity: 1,
  learningPoints: ["Lifecycle cutoffs"],
};

beforeEach(async () => {
  organizerId = randomUUID();
  workshopId = randomUUID();
  await db.insert(organizers).values({ id: organizerId, name: "Lifecycle Tester", contactEmail: `${organizerId}@example.test` });
  await db.insert(workshops).values({ ...changes, id: workshopId, organizerId, slug: `lifecycle-${workshopId}`, status: "published" });
});

afterEach(async () => {
  vi.useRealTimers();
  await db.delete(registrations).where(eq(registrations.workshopId, workshopId));
  await db.delete(workshops).where(eq(workshops.id, workshopId));
  await db.delete(organizers).where(eq(organizers.id, organizerId));
});

function register() {
  return registerAttendee({ workshopId, attendeeName: "Lifecycle Attendee", attendeeEmail: `${randomUUID()}@example.test` });
}

async function setupQueue() {
  const confirmed = await register();
  const waiting = await register();
  if (confirmed.outcome !== "confirmed" || waiting.outcome !== "waitlisted") throw new Error("Invalid fixture");
  return { confirmed, waiting };
}

it("closes eligibility at the exact start instant", () => {
  const workshop = { status: "published", isDemo: false, startsAt: changes.startsAt };
  expect(canAcceptAttendees(workshop, new Date(changes.startsAt.getTime() - 1))).toBe(true);
  expect(canAcceptAttendees(workshop, changes.startsAt)).toBe(false);
});

it.each(["started", "canceled", "draft", "demo"])("blocks booking and promotion for %s workshops but permits cancellation", async (state) => {
  const { confirmed, waiting } = await setupQueue();
  await db.update(workshops).set({
    status: state === "canceled" || state === "draft" ? state : "published",
    isDemo: state === "demo",
    startsAt: state === "started" ? new Date(Date.now() - 1_000) : changes.startsAt,
  }).where(eq(workshops.id, workshopId));
  expect(await register()).toEqual({ outcome: "unavailable" });
  expect(await cancelRegistration(confirmed.cancellationToken)).toEqual({ outcome: "canceled" });
  const [stored] = await db.select().from(registrations).where(eq(registrations.id, waiting.registrationId));
  expect(stored.status).toBe("waitlisted");
  expect(await cancelRegistration(confirmed.cancellationToken)).toEqual({ outcome: "unavailable" });
  expect(await cancelRegistration(waiting.cancellationToken)).toEqual({ outcome: "canceled" });
});

// Hold the row, prove the competing request really is waiting, then change
// the clock or workshop state before releasing it. No timing-dependent sleeps.
async function withBlockedRequest<T>(operation: () => Promise<T>, close: "clock" | "cancel") {
  let release!: () => void;
  let locked!: (pid: number) => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const ready = new Promise<number>((resolve) => { locked = resolve; });
  const holder = db.transaction(async (tx) => {
    await tx.select().from(workshops).where(eq(workshops.id, workshopId)).for("update");
    const pid = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
    locked(pid.rows[0].pid);
    await gate;
    if (close === "cancel") await tx.update(workshops).set({ status: "canceled" }).where(eq(workshops.id, workshopId));
  });
  const pid = await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended early"); })]);
  const request = operation();
  try {
    const deadline = Date.now() + 5_000;
    while (true) {
      const result = await db.execute<{ blocked: boolean }>(sql`
        select exists(select 1 from pg_stat_activity where ${pid} = any(pg_blocking_pids(pid))) as blocked
      `);
      if (result.rows[0].blocked) break;
      if (Date.now() > deadline) throw new Error("Request did not wait on the workshop lock");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    if (close === "clock") {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(changes.startsAt);
    }
  } finally {
    release();
    await holder;
    await request;
  }
  return request;
}

it.each(["clock", "cancel"] as const)("rechecks registration after waiting across %s closure", async (close) => {
  expect(await withBlockedRequest(register, close)).toEqual({ outcome: "unavailable" });
  expect(await db.select().from(registrations).where(eq(registrations.workshopId, workshopId))).toHaveLength(0);
});

it.each(["clock", "cancel"] as const)("rechecks cancellation promotion after waiting across %s closure", async (close) => {
  const { confirmed, waiting } = await setupQueue();
  expect(await withBlockedRequest(() => cancelRegistration(confirmed.cancellationToken), close)).toEqual({ outcome: "canceled" });
  const [stored] = await db.select().from(registrations).where(eq(registrations.id, waiting.registrationId));
  expect(stored.status).toBe("waitlisted");
});

it.each(["clock", "cancel"] as const)("rechecks capacity promotion after waiting across %s closure", async (close) => {
  const { waiting } = await setupQueue();
  const result = await withBlockedRequest(() => updateOrganizerWorkshop(organizerId, workshopId, { ...changes, capacity: 2 }), close);
  expect(result).toMatchObject(close === "clock" ? { outcome: "updated", promotions: [] } : { outcome: "unavailable" });
  const [stored] = await db.select().from(registrations).where(eq(registrations.id, waiting.registrationId));
  expect(stored.status).toBe("waitlisted");
});
