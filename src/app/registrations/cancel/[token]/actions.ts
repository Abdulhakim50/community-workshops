"use server";

import { z } from "zod";
import { sendAttendeeNotification } from "@/lib/notifications";
import { cancelRegistration } from "@/lib/registration";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export type CancellationActionState = {
  outcome?: "canceled" | "unavailable" | "error";
  promoted?: boolean;
};

export async function submitCancellation(
  _previousState: CancellationActionState,
  formData: FormData,
): Promise<CancellationActionState> {
  const token = tokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { outcome: "unavailable" };

  try {
    const result = await cancelRegistration(token.data);
    if (result.outcome === "unavailable") return result;
    if (result.promotion) {
      await sendAttendeeNotification({ ...result.promotion, kind: "promoted" });
    }
    return { outcome: "canceled", promoted: Boolean(result.promotion) };
  } catch (error) {
    console.error("Could not cancel registration", error);
    return { outcome: "error" };
  }
}
