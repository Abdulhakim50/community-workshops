import type { Metadata } from "next";
import { getOrganizerWorkshops, requireOrganizer } from "@/lib/organizer";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default async function OrganizerPage() {
  const organizer = await requireOrganizer();
  const ownWorkshops = await getOrganizerWorkshops(organizer.id);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">Organizer workspace</p>
          <h1 className="mt-3 text-4xl font-bold">Hello, {organizer.name}</h1>
          <p className="mt-3 text-[#596760]">Your workshops appear here. Creation and editing are coming next.</p>
        </div>
        <SignOutButton />
      </div>
      <section className="mt-10" aria-labelledby="your-workshops">
        <h2 id="your-workshops" className="text-2xl font-bold">Your workshops</h2>
        {ownWorkshops.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#bdc8bc] bg-white p-8 text-[#596760]">
            You do not have any workshops yet.
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {ownWorkshops.map((workshop) => (
              <li key={workshop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce1d6] bg-white p-5">
                <span className="font-semibold">{workshop.title}</span>
                <span className="text-sm text-[#596760]">{workshop.status} · {workshop.startsAt.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
