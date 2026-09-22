"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registerAttendee } from "@/lib/registration";

const registrationSchema = z.object({
  workshopId: z.string().uuid(),
  attendeeName: z.string().trim().min(2, "Enter your name.").max(100),
  attendeeEmail: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
});

export type RegistrationActionState = {
  outcome?: "confirmed" | "waitlisted" | "duplicate" | "unavailable" | "error";
  position?: number;
  cancellationToken?: string;
  fieldErrors?: Partial<Record<"attendeeName" | "attendeeEmail", string>>;
};

export async function submitRegistration(
  _previousState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const parsed = registrationSchema.safeParse({
    workshopId: formData.get("workshopId"),
    attendeeName: formData.get("attendeeName"),
    attendeeEmail: formData.get("attendeeEmail"),
  });

  if (!parsed.success) {
    const fieldErrors: RegistrationActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "attendeeName" || field === "attendeeEmail") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    const result = await registerAttendee(parsed.data);
    revalidatePath("/workshops");
    return result;
  } catch (error) {
    console.error("Could not register attendee", error);
    return { outcome: "error" };
  }
}
