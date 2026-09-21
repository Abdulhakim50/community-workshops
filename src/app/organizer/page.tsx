import type { Metadata } from "next";
import Link from "next/link";
import { getOrganizerWorkshops, requireOrganizer } from "@/lib/organizer";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Organizer dashboard" };

export default async function OrganizerPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const organizer = await requireOrganizer();
  const ownWorkshops = await getOrganizerWorkshops(organizer.id);
  const { notice } = await searchParams;
  const noticeText = notice === "published"
    ? "Workshop published. It is now visible on the public schedule."
    : notice === "canceled"
      ? "Workshop canceled and removed from the public schedule."
      : notice === "workshop-not-changed"
        ? "That workshop could not be changed. Refresh the page and try again."
        : notice === "invalid-workshop"
          ? "That workshop link is invalid."
          : undefined;

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">Organizer workspace</p>
          <h1 className="mt-3 text-4xl font-bold">Hello, {organizer.name}</h1>
          <p className="mt-3 text-[#596760]">Create workshops, review drafts, and control what appears publicly.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/organizer/workshops/new" className="rounded-full bg-[#203e32] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#315849]">Create workshop</Link>
          <SignOutButton />
        </div>
      </div>
      {noticeText && <p className="mt-7 rounded-xl bg-[#e7f4d4] px-5 py-4 text-sm font-semibold text-[#315c24]" role="status">{noticeText}</p>}
      <section className="mt-10" aria-labelledby="your-workshops">
        <h2 id="your-workshops" className="text-2xl font-bold">Your workshops</h2>
        {ownWorkshops.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#bdc8bc] bg-white p-8 text-[#596760]">
            You do not have any workshops yet. Create a draft to get started.
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {ownWorkshops.map((workshop) => (
              <li key={workshop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce1d6] bg-white p-5">
                <div>
                  <Link href={`/organizer/workshops/${workshop.id}/edit`} className="font-semibold hover:text-[#537b26] hover:underline">{workshop.title}</Link>
                  <p className="mt-1 text-sm capitalize text-[#596760]">{workshop.status} · {workshop.startsAt.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}</p>
                </div>
                <Link href={`/organizer/workshops/${workshop.id}/edit`} className="text-sm font-bold text-[#315b47] hover:underline">Manage</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
