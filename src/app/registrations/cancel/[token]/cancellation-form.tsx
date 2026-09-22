"use client";

import { useActionState } from "react";
import { submitCancellation, type CancellationActionState } from "./actions";

const initialState: CancellationActionState = {};

export function CancellationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitCancellation, initialState);

  if (state.outcome === "canceled") {
    return (
      <div className="mt-7 rounded-xl bg-[#e7f4d4] px-5 py-5 text-[#315c24]" role="status">
        <h2 className="font-bold">Your registration is canceled</h2>
        <p className="mt-2 text-sm leading-6">
          {state.promoted
            ? "The first person on the waitlist has been given the open seat."
            : "No further action is needed."}
        </p>
      </div>
    );
  }

  const message = state.outcome === "unavailable"
    ? "This registration is already canceled or the link is no longer valid."
    : state.outcome === "error"
      ? "We could not cancel this registration. Please try again."
      : undefined;

  return (
    <form action={formAction} className="mt-7">
      <input type="hidden" name="token" value={token} />
      {message && <p role="alert" className="mb-4 rounded-lg bg-[#fff0e8] px-4 py-3 text-sm text-[#8a341d]">{message}</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-[#9f3e28] px-6 py-3 font-bold text-white hover:bg-[#7d2f1f] disabled:opacity-60">
        {pending ? "Canceling…" : "Cancel my registration"}
      </button>
    </form>
  );
}
