"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveWorkshop, type WorkshopActionState } from "./actions";

export type WorkshopFormDefaults = {
  id?: string;
  title?: string;
  summary?: string;
  description?: string;
  category?: string;
  startsAtLocal?: string;
  endsAtLocal?: string;
  timeZone?: string;
  venue?: string;
  address?: string;
  capacity?: number;
  learningPointsText?: string;
};

const initialState: WorkshopActionState = {};
const inputClass = "mt-2 block w-full rounded-lg border border-[#bdc8bc] bg-white px-4 py-3 font-normal";

export function WorkshopForm({ defaults = {} }: { defaults?: WorkshopFormDefaults }) {
  const [state, formAction, pending] = useActionState(saveWorkshop, initialState);
  const error = (field: keyof NonNullable<WorkshopActionState["fieldErrors"]>) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="mt-8 space-y-8 rounded-2xl border border-[#dce1d6] bg-white p-6 shadow-sm sm:p-8">
      {defaults.id && <input type="hidden" name="workshopId" value={defaults.id} />}
      {state.message && <p role="alert" className="rounded-lg bg-[#fff0e8] px-4 py-3 text-sm text-[#8a341d]">{state.message}</p>}

      <fieldset className="space-y-5">
        <legend className="text-xl font-bold">Workshop overview</legend>
        <Field label="Title" error={error("title")}>
          <input className={inputClass} name="title" defaultValue={defaults.title} required minLength={3} maxLength={120} />
        </Field>
        <Field label="Short summary" hint="Shown on workshop cards." error={error("summary")}>
          <textarea className={inputClass} name="summary" defaultValue={defaults.summary} required minLength={10} maxLength={240} rows={3} />
        </Field>
        <Field label="Full description" error={error("description")}>
          <textarea className={inputClass} name="description" defaultValue={defaults.description} required minLength={30} maxLength={5000} rows={7} />
        </Field>
        <Field label="Category" error={error("category")}>
          <input className={inputClass} name="category" defaultValue={defaults.category} required maxLength={60} placeholder="Art & craft" />
        </Field>
        <Field label="What attendees will learn" hint="Enter one learning point per line (up to 8)." error={error("learningPointsText")}>
          <textarea className={inputClass} name="learningPointsText" defaultValue={defaults.learningPointsText} required maxLength={1500} rows={5} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5 border-t border-[#e5e9df] pt-8">
        <legend className="text-xl font-bold">Schedule and location</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starts" error={error("startsAtLocal")}>
            <input className={inputClass} name="startsAtLocal" type="datetime-local" defaultValue={defaults.startsAtLocal} required />
          </Field>
          <Field label="Ends" error={error("endsAtLocal")}>
            <input className={inputClass} name="endsAtLocal" type="datetime-local" defaultValue={defaults.endsAtLocal} required />
          </Field>
        </div>
        <Field label="Time zone" hint="Use an IANA name such as America/Los_Angeles." error={error("timeZone")}>
          <input className={inputClass} name="timeZone" defaultValue={defaults.timeZone ?? "America/Los_Angeles"} required maxLength={80} />
        </Field>
        <Field label="Venue" error={error("venue")}>
          <input className={inputClass} name="venue" defaultValue={defaults.venue} required maxLength={120} />
        </Field>
        <Field label="Street address" error={error("address")}>
          <input className={inputClass} name="address" defaultValue={defaults.address} required maxLength={240} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5 border-t border-[#e5e9df] pt-8">
        <legend className="text-xl font-bold">Capacity</legend>
        <Field label="Number of seats" error={error("capacity")}>
          <input className={inputClass} name="capacity" type="number" defaultValue={defaults.capacity ?? 12} required min={1} max={10000} />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-[#e5e9df] pt-7">
        <button type="submit" disabled={pending} className="rounded-full bg-[#203e32] px-6 py-3 font-bold text-white hover:bg-[#315849] disabled:opacity-60">
          {pending ? "Saving…" : defaults.id ? "Save changes" : "Create draft"}
        </button>
        <Link href="/organizer" className="rounded-full px-4 py-3 font-semibold text-[#405549] hover:underline">Back to dashboard</Link>
      </div>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {hint && <span className="ml-2 font-normal text-[#68766f]">{hint}</span>}
      {children}
      {error && <span className="mt-2 block font-normal text-[#a03820]" role="alert">{error}</span>}
    </label>
  );
}
