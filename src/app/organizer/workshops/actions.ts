"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { workshops } from "@/db/schema";
import { requireOrganizer } from "@/lib/organizer";
import { updateOrganizerWorkshop } from "@/lib/workshop-management";
import { sendAttendeeNotification } from "@/lib/notifications";
import { parseWorkshopForm, slugifyWorkshopTitle, type WorkshopFormField } from "@/lib/workshop-form";

export type WorkshopActionState = {
  message?: string;
  fieldErrors?: Partial<Record<WorkshopFormField, string>>;
};

const workshopIdSchema = z.string().uuid();

export async function saveWorkshop(
  _previousState: WorkshopActionState,
  formData: FormData,
): Promise<WorkshopActionState> {
  const organizer = await requireOrganizer();
  const parsed = parseWorkshopForm(formData);
  if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

  const rawId = formData.get("workshopId");
  const id = typeof rawId === "string" && rawId ? workshopIdSchema.safeParse(rawId) : undefined;

  try {
    if (id) {
      if (!id.success) return { message: "This workshop link is invalid." };

      const updated = await updateOrganizerWorkshop(organizer.id, id.data, parsed.data);
      if (updated.outcome === "unavailable") return { message: "This workshop could not be edited." };
      if (updated.outcome === "below-confirmed") {
        return { fieldErrors: { capacity: `There are ${updated.confirmedCount} confirmed registrations. Capacity must be at least ${updated.confirmedCount}.` } };
      }
      let unsent = 0;
      for (const promotion of updated.promotions) {
        const delivery = await sendAttendeeNotification({ ...promotion, kind: "promoted" });
        if (delivery !== "sent") unsent += 1;
      }
      revalidatePath("/organizer");
      revalidatePath(`/organizer/workshops/${updated.id}/attendees`);
      revalidatePath(`/workshops/${updated.slug}`);
      redirect(`/organizer/workshops/${updated.id}/edit?saved=1&promoted=${updated.promotions.length}&unsent=${unsent}`);
    }

    const baseSlug = slugifyWorkshopTitle(parsed.data.title);
    const existing = await db
      .select({ id: workshops.id })
      .from(workshops)
      .where(eq(workshops.slug, baseSlug))
      .limit(1);
    const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${randomUUID().slice(0, 8)}`;
    const [created] = await db
      .insert(workshops)
      .values({ ...parsed.data, organizerId: organizer.id, slug, status: "draft" })
      .returning({ id: workshops.id });

    revalidatePath("/organizer");
    redirect(`/organizer/workshops/${created.id}/edit?created=1`);
  } catch (error) {
    // Next.js redirects are implemented as framework errors and must escape.
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Could not save workshop", error);
    return { message: "We could not save the workshop. Please try again." };
  }
}

async function changeWorkshopStatus(formData: FormData, status: "published" | "canceled") {
  const organizer = await requireOrganizer();
  const id = workshopIdSchema.safeParse(formData.get("workshopId"));
  if (!id.success) redirect("/organizer?notice=invalid-workshop");

  const allowedCurrentStatus = status === "published" ? "draft" : undefined;
  const conditions = [eq(workshops.id, id.data), eq(workshops.organizerId, organizer.id)];
  if (allowedCurrentStatus) conditions.push(eq(workshops.status, allowedCurrentStatus));
  else conditions.push(ne(workshops.status, "canceled"));

  const updated = await db
    .update(workshops)
    .set({ status, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ slug: workshops.slug });

  if (!updated[0]) redirect("/organizer?notice=workshop-not-changed");
  revalidatePath("/organizer");
  revalidatePath("/workshops");
  revalidatePath(`/workshops/${updated[0].slug}`);
  redirect(`/organizer?notice=${status}`);
}

export async function publishWorkshop(formData: FormData) {
  await changeWorkshopStatus(formData, "published");
}

export async function cancelWorkshop(formData: FormData) {
  await changeWorkshopStatus(formData, "canceled");
}
