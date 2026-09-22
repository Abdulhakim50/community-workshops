import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations, workshops } from "@/db/schema";

export type RegistrationResult =
  | { outcome: "confirmed"; cancellationToken: string }
  | { outcome: "waitlisted"; position: number; cancellationToken: string }
  | { outcome: "duplicate" }
  | { outcome: "unavailable" };

export async function registerAttendee(input: {
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
}): Promise<RegistrationResult> {
  const attendeeEmail = input.attendeeEmail.trim().toLowerCase();
  const cancellationToken = randomBytes(32).toString("base64url");
  const cancellationTokenHash = hashCancellationToken(cancellationToken);

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
        cancellationTokenHash,
        status: isConfirmed ? "confirmed" : "waitlisted",
      });

      return isConfirmed
        ? { outcome: "confirmed", cancellationToken }
        : { outcome: "waitlisted", position: counts.waitlisted + 1, cancellationToken };
    });
  } catch (error) {
    // The partial unique index is a final guard if an active duplicate exists.
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return { outcome: "duplicate" };
    }
    throw error;
  }
}

export type CancellationResult =
  | { outcome: "canceled"; promoted: boolean }
  | { outcome: "unavailable" };

export function hashCancellationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCancellationDetails(token: string) {
  const tokenHash = hashCancellationToken(token);
  const [details] = await db
    .select({
      attendeeName: registrations.attendeeName,
      registrationStatus: registrations.status,
      workshopTitle: workshops.title,
    })
    .from(registrations)
    .innerJoin(workshops, eq(registrations.workshopId, workshops.id))
    .where(eq(registrations.cancellationTokenHash, tokenHash))
    .limit(1);

  return details;
}

export async function cancelRegistration(token: string): Promise<CancellationResult> {
  const tokenHash = hashCancellationToken(token);

  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ workshopId: registrations.workshopId })
      .from(registrations)
      .where(eq(registrations.cancellationTokenHash, tokenHash))
      .limit(1);

    if (!candidate) return { outcome: "unavailable" };

    await tx
      .select({ id: workshops.id })
      .from(workshops)
      .where(eq(workshops.id, candidate.workshopId))
      .for("update");

    const [registration] = await tx
      .select({ id: registrations.id, status: registrations.status })
      .from(registrations)
      .where(and(
        eq(registrations.cancellationTokenHash, tokenHash),
        ne(registrations.status, "canceled"),
      ))
      .limit(1);

    if (!registration) return { outcome: "unavailable" };

    await tx
      .update(registrations)
      .set({ status: "canceled", canceledAt: new Date(), checkedInAt: null })
      .where(eq(registrations.id, registration.id));

    if (registration.status !== "confirmed") return { outcome: "canceled", promoted: false };

    const [nextInLine] = await tx
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(
        eq(registrations.workshopId, candidate.workshopId),
        eq(registrations.status, "waitlisted"),
      ))
      .orderBy(asc(registrations.registeredAt), asc(registrations.id))
      .limit(1);

    if (!nextInLine) return { outcome: "canceled", promoted: false };

    await tx
      .update(registrations)
      .set({ status: "confirmed" })
      .where(and(eq(registrations.id, nextInLine.id), eq(registrations.status, "waitlisted")));

    return { outcome: "canceled", promoted: true };
  });
}
