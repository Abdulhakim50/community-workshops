"use client";

import { useActionState } from "react";
import { submitRegistration, type RegistrationActionState } from "./registration-actions";

const initialState: RegistrationActionState = {};
const inputClass = "mt-2 block w-full rounded-lg border border-[#bdc8bc] bg-white px-4 py-3 font-normal";

export function RegistrationForm({ workshopId, isFull }: { workshopId: string; isFull: boolean }) {
  const [state, formAction, pending] = useActionState(submitRegistration, initialState);

  if (state.outcome === "confirmed") {
    return <Result title="Your seat is confirmed" message="You are registered for this workshop." cancellationToken={state.cancellationToken} notificationDelivery={state.notificationDelivery} />;
  }
  if (state.outcome === "waitlisted") {
    return <Result title="You joined the waitlist" message={`You are number ${state.position} on the waitlist.`} cancellationToken={state.cancellationToken} notificationDelivery={state.notificationDelivery} />;
  }

  const message = state.outcome === "duplicate"
    ? "That email already has an active registration for this workshop."
    : state.outcome === "unavailable"
      ? "Registration is no longer available for this workshop."
      : state.outcome === "error"
        ? "We could not complete your registration. Please try again."
        : undefined;

  return (
    <form action={formAction} className="mt-7 space-y-4 border-t border-[#e5e9df] pt-6">
      <input type="hidden" name="workshopId" value={workshopId} />
      <h2 className="text-xl font-bold">{isFull ? "Join the waitlist" : "Reserve your seat"}</h2>
      <p className="text-sm leading-6 text-[#596760]">
        {isFull ? "This workshop is full. Register to join the ordered waitlist." : "No attendee account is required."}
      </p>
      {message && <p role="alert" className="rounded-lg bg-[#fff0e8] px-4 py-3 text-sm text-[#8a341d]">{message}</p>}
      <label className="block text-sm font-semibold">
        Name
        <input className={inputClass} name="attendeeName" autoComplete="name" required minLength={2} maxLength={100} />
        {state.fieldErrors?.attendeeName && <span role="alert" className="mt-2 block font-normal text-[#a03820]">{state.fieldErrors.attendeeName}</span>}
      </label>
      <label className="block text-sm font-semibold">
        Email
        <input className={inputClass} name="attendeeEmail" type="email" autoComplete="email" required maxLength={254} />
        {state.fieldErrors?.attendeeEmail && <span role="alert" className="mt-2 block font-normal text-[#a03820]">{state.fieldErrors.attendeeEmail}</span>}
      </label>
      <button type="submit" disabled={pending} className="w-full rounded-full bg-[#203e32] px-5 py-3 font-bold text-white hover:bg-[#315849] disabled:opacity-60">
        {pending ? "Registering…" : isFull ? "Join waitlist" : "Register"}
      </button>
      <p className="text-xs leading-5 text-[#68766f]">We use your email to prevent duplicate registrations and send workshop and cancellation updates.</p>
    </form>
  );
}

function Result({ title, message, cancellationToken, notificationDelivery }: {
  title: string;
  message: string;
  cancellationToken?: string;
  notificationDelivery?: "sent" | "skipped" | "failed";
}) {
  const deliveryMessage = notificationDelivery === "sent"
    ? "We sent the details and cancellation link to your email."
    : notificationDelivery === "failed"
      ? "Your registration succeeded, but the email could not be sent. Save the private link below."
      : "Email delivery is not configured here yet. Save the private link below.";

  return (
    <div className="mt-7 rounded-xl bg-[#e7f4d4] px-5 py-5 text-[#315c24]" role="status">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <p className="mt-2 text-sm leading-6">{deliveryMessage}</p>
      {cancellationToken && (
        <p className="mt-3 text-sm leading-6">
          Save this private link if you may need to cancel: {" "}
          <a className="font-bold underline" href={`/registrations/cancel/${cancellationToken}`}>manage registration</a>.
        </p>
      )}
    </div>
  );
}
