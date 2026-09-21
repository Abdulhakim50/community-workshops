import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { organizers, workshops } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function requireOrganizer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/organizer/sign-in");

  const [organizer] = await db
    .select()
    .from(organizers)
    .where(eq(organizers.authUserId, session.user.id))
    .limit(1);

  if (!organizer) {
    throw new Error("No organizer profile is linked to this account.");
  }

  return organizer;
}

export async function getOrganizerWorkshops(organizerId: string) {
  return db
    .select({
      id: workshops.id,
      title: workshops.title,
      status: workshops.status,
      startsAt: workshops.startsAt,
    })
    .from(workshops)
    .where(eq(workshops.organizerId, organizerId))
    .orderBy(workshops.startsAt);
}

export async function getOrganizerWorkshop(organizerId: string, workshopId: string) {
  const [workshop] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.organizerId, organizerId)))
    .limit(1);

  return workshop;
}
