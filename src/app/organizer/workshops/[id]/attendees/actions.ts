"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganizer } from "@/lib/organizer";
import { setAttendeeCheckIn } from "@/lib/organizer-registrations";

const checkInSchema = z.object({
  workshopId: z.string().uuid(),
  registrationId: z.string().uuid(),
  checkedIn: z.enum(["true", "false"]),
});

export async function updateCheckIn(formData: FormData) {
  const organizer = await requireOrganizer();
  const parsed = checkInSchema.safeParse({
    workshopId: formData.get("workshopId"),
    registrationId: formData.get("registrationId"),
    checkedIn: formData.get("checkedIn"),
  });

  if (!parsed.success) redirect("/organizer?notice=invalid-workshop");

  const updated = await setAttendeeCheckIn({
    organizerId: organizer.id,
    workshopId: parsed.data.workshopId,
    registrationId: parsed.data.registrationId,
    checkedIn: parsed.data.checkedIn === "true",
  });

  const path = `/organizer/workshops/${parsed.data.workshopId}/attendees`;
  revalidatePath(path);
  redirect(`${path}?notice=${updated ? "check-in-updated" : "attendee-not-changed"}`);
}
