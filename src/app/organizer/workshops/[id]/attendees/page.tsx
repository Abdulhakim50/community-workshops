import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireOrganizer } from "@/lib/organizer";
import { getOrganizerWorkshopAttendees } from "@/lib/organizer-registrations";
import { updateCheckIn } from "./actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
};

type Attendee = NonNullable<Awaited<ReturnType<typeof getOrganizerWorkshopAttendees>>>["confirmed"][number];

export const metadata: Metadata = { title: "Workshop attendees" };
export const dynamic = "force-dynamic";

function formatDateTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-xl border border-dashed border-[#bdc8bc] bg-white p-6 text-[#596760]">{children}</p>;
}

function AttendeeIdentity({ attendee }: { attendee: Attendee }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-[#17231f]">{attendee.attendeeName}</p>
      <a className="mt-1 block break-all text-sm text-[#315b47] hover:underline" href={`mailto:${attendee.attendeeEmail}`}>
        {attendee.attendeeEmail}
      </a>
    </div>
  );
}

export default async function WorkshopAttendeesPage({ params, searchParams }: Props) {
  const organizer = await requireOrganizer();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const data = await getOrganizerWorkshopAttendees(organizer.id, id);
  if (!data) notFound();
  const { workshop, counts, confirmed, waitlisted, canceled } = data;
  const { notice } = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <Link href={`/organizer/workshops/${workshop.id}/edit`} className="text-sm font-bold text-[#315b47] hover:underline">
        ← Back to workshop
      </Link>
      <div className="mt-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">Organizer attendance</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em]">{workshop.title}</h1>
        <p className="mt-3 text-[#596760]">
          {formatDateTime(workshop.startsAt, workshop.timeZone)} · <span className="capitalize">{workshop.status}</span>
        </p>
      </div>

      {notice === "check-in-updated" && (
        <p role="status" className="mt-7 rounded-xl bg-[#e7f4d4] px-5 py-4 text-sm font-semibold text-[#315c24]">Attendance updated.</p>
      )}
      {notice === "attendee-not-changed" && (
        <p role="alert" className="mt-7 rounded-xl bg-[#fff0e8] px-5 py-4 text-sm font-semibold text-[#8a341d]">That attendee could not be updated. Refresh and try again.</p>
      )}

      <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Confirmed", `${counts.confirmed} / ${workshop.capacity}`],
          ["Checked in", `${counts.checkedIn} / ${counts.confirmed}`],
          ["Waitlisted", String(counts.waitlisted)],
          ["Canceled", String(counts.canceled)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#dce1d6] bg-white p-5">
            <dt className="text-sm font-semibold text-[#596760]">{label}</dt>
            <dd className="mt-2 text-3xl font-bold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12" aria-labelledby="confirmed-heading">
        <h2 id="confirmed-heading" className="text-2xl font-bold">Confirmed attendees</h2>
        {confirmed.length === 0 ? <EmptyList>No confirmed attendees yet.</EmptyList> : (
          <ul className="mt-4 space-y-3">
            {confirmed.map((attendee) => (
              <li key={attendee.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce1d6] bg-white p-5">
                <AttendeeIdentity attendee={attendee} />
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className={`font-bold ${attendee.checkedInAt ? "text-[#315c24]" : "text-[#596760]"}`}>
                      {attendee.checkedInAt ? "Checked in" : "Not checked in"}
                    </p>
                    <p className="mt-1 text-xs text-[#68766f]">Registered {formatDateTime(attendee.registeredAt, workshop.timeZone)}</p>
                  </div>
                  <form action={updateCheckIn}>
                    <input type="hidden" name="workshopId" value={workshop.id} />
                    <input type="hidden" name="registrationId" value={attendee.id} />
                    <input type="hidden" name="checkedIn" value={attendee.checkedInAt ? "false" : "true"} />
                    <button className={`rounded-full px-4 py-2 text-sm font-bold ${attendee.checkedInAt ? "border border-[#bdc8bc] text-[#405549] hover:bg-[#eff3e9]" : "bg-[#203e32] text-white hover:bg-[#315849]"}`}>
                      {attendee.checkedInAt ? "Undo check-in" : "Check in"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="waitlist-heading">
        <h2 id="waitlist-heading" className="text-2xl font-bold">Waitlist</h2>
        {waitlisted.length === 0 ? <EmptyList>No one is waiting for a seat.</EmptyList> : (
          <ol className="mt-4 space-y-3">
            {waitlisted.map((attendee, index) => (
              <li key={attendee.id} className="flex items-center gap-4 rounded-xl border border-[#dce1d6] bg-white p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eff3e9] font-bold text-[#315b47]">{index + 1}</span>
                <AttendeeIdentity attendee={attendee} />
                <p className="ml-auto hidden text-xs text-[#68766f] sm:block">Joined {formatDateTime(attendee.registeredAt, workshop.timeZone)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canceled.length > 0 && (
        <section className="mt-12" aria-labelledby="canceled-heading">
          <h2 id="canceled-heading" className="text-2xl font-bold">Canceled registrations</h2>
          <ul className="mt-4 space-y-3">
            {canceled.map((attendee) => (
              <li key={attendee.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#dce1d6] bg-[#f7f7f3] p-5">
                <AttendeeIdentity attendee={attendee} />
                <p className="text-sm text-[#68766f]">Canceled {attendee.canceledAt ? formatDateTime(attendee.canceledAt, workshop.timeZone) : "registration"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
