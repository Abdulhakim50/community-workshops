"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
    revalidatePath("/workshops");
    return result;
  } catch (error) {
    console.error("Could not cancel registration", error);
    return { outcome: "error" };
  }
}
