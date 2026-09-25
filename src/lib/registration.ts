import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { registrations, workshops } from "@/db/schema";
import { canAcceptAttendees } from "@/lib/workshop-eligibility";

export type RegistrationResult =
  | SuccessfulRegistrationResult
  | { outcome: "duplicate" }
  | { outcome: "unavailable" };

export type WorkshopNotificationDetails = {
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  venue: string;
  address: string;
};

type SuccessfulRegistrationDetails = {
  registrationId: string;
  cancellationToken: string;
  attendeeName: string;
  attendeeEmail: string;
  workshop: WorkshopNotificationDetails;
};

export type SuccessfulRegistrationResult =
  | (SuccessfulRegistrationDetails & { outcome: "confirmed" })
  | (SuccessfulRegistrationDetails & { outcome: "waitlisted"; position: number });

export async function registerAttendee(input: {
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
}): Promise<RegistrationResult> {
  const registrationId = randomUUID();
  const attendeeEmail = input.attendeeEmail.trim().toLowerCase();
  const attendeeName = input.attendeeName.trim();
  const cancellationToken = createCancellationToken(registrationId);
  const cancellationTokenHash = hashCancellationToken(cancellationToken);

  try {
    return await db.transaction(async (tx) => {
      // Every registration for one workshop takes the same row lock. This makes
      // the capacity check and insert one serialized operation under concurrency.
      const [workshop] = await tx
        .select({
          id: workshops.id,
          title: workshops.title,
          slug: workshops.slug,
          capacity: workshops.capacity,
          startsAt: workshops.startsAt,
          endsAt: workshops.endsAt,
          timeZone: workshops.timeZone,
          venue: workshops.venue,
          address: workshops.address,
          isDemo: workshops.isDemo,
          status: workshops.status,
        })
        .from(workshops)
        .where(and(eq(workshops.id, input.workshopId), eq(workshops.status, "published")))
        .for("update");

      if (!workshop || !canAcceptAttendees(workshop)) {
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
        id: registrationId,
        workshopId: workshop.id,
        attendeeName,
        attendeeEmail,
        cancellationTokenHash,
        status: isConfirmed ? "confirmed" : "waitlisted",
      });

      const details: SuccessfulRegistrationDetails = {
        registrationId,
        cancellationToken,
        attendeeName,
        attendeeEmail,
        workshop: {
          title: workshop.title,
          slug: workshop.slug,
          startsAt: workshop.startsAt,
          endsAt: workshop.endsAt,
          timeZone: workshop.timeZone,
          venue: workshop.venue,
          address: workshop.address,
        },
      };
      return isConfirmed
        ? { ...details, outcome: "confirmed" }
        : { ...details, outcome: "waitlisted", position: counts.waitlisted + 1 };
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
  | { outcome: "canceled"; promotion?: PromotionNotificationDetails }
  | { outcome: "unavailable" };

export type PromotionNotificationDetails = {
  registrationId: string;
  cancellationToken: string;
  attendeeName: string;
  attendeeEmail: string;
  workshop: WorkshopNotificationDetails;
};

function getCancellationTokenSecret() {
  const secret = process.env.CANCELLATION_TOKEN_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CANCELLATION_TOKEN_SECRET or BETTER_AUTH_SECRET must be at least 32 characters.");
  }
  return secret;
}

export function createCancellationToken(registrationId: string) {
  return createHmac("sha256", getCancellationTokenSecret())
    .update(`registration-cancellation:${registrationId}`)
    .digest("base64url");
}

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
      status: workshops.status,
      isDemo: workshops.isDemo,
      startsAt: workshops.startsAt,
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

    const [workshop] = await tx
      .select({
        id: workshops.id,
        title: workshops.title,
        slug: workshops.slug,
        startsAt: workshops.startsAt,
        endsAt: workshops.endsAt,
        timeZone: workshops.timeZone,
        venue: workshops.venue,
        address: workshops.address,
        status: workshops.status,
        isDemo: workshops.isDemo,
      })
      .from(workshops)
      .where(eq(workshops.id, candidate.workshopId))
      .for("update");

    if (!workshop) return { outcome: "unavailable" };

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

    if (registration.status !== "confirmed" || !canAcceptAttendees(workshop)) {
      return { outcome: "canceled" };
    }

    const [nextInLine] = await tx
      .select({
        id: registrations.id,
        attendeeName: registrations.attendeeName,
        attendeeEmail: registrations.attendeeEmail,
      })
      .from(registrations)
      .where(and(
        eq(registrations.workshopId, candidate.workshopId),
        eq(registrations.status, "waitlisted"),
      ))
      .orderBy(asc(registrations.registeredAt), asc(registrations.id))
      .limit(1);

    if (!nextInLine) return { outcome: "canceled" };

    await tx
      .update(registrations)
      .set({ status: "confirmed" })
      .where(and(eq(registrations.id, nextInLine.id), eq(registrations.status, "waitlisted")));

    return {
      outcome: "canceled",
      promotion: {
        registrationId: nextInLine.id,
        cancellationToken: createCancellationToken(nextInLine.id),
        attendeeName: nextInLine.attendeeName,
        attendeeEmail: nextInLine.attendeeEmail,
        workshop: {
          title: workshop.title,
          slug: workshop.slug,
          startsAt: workshop.startsAt,
          endsAt: workshop.endsAt,
          timeZone: workshop.timeZone,
          venue: workshop.venue,
          address: workshop.address,
        },
      },
    };
  });
}
