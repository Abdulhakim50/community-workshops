import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizerWorkshop, requireOrganizer } from "@/lib/organizer";
import { dateToLocalInput } from "@/lib/workshop-form";
import { WorkshopForm } from "../../workshop-form";
import { WorkshopStatusActions } from "../../status-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
};

export const metadata: Metadata = { title: "Edit workshop" };

export default async function EditWorkshopPage({ params, searchParams }: Props) {
  const organizer = await requireOrganizer();
  const { id } = await params;
  const workshop = await getOrganizerWorkshop(organizer.id, id);
  if (!workshop) notFound();
  const notice = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#537b26]">{workshop.status} workshop</p>
          <h1 className="mt-3 text-4xl font-bold">Edit workshop</h1>
          <Link href={`/organizer/workshops/${workshop.id}/attendees`} className="mt-3 inline-flex text-sm font-bold text-[#315b47] hover:underline">
            View attendees and check-in
          </Link>
        </div>
        <WorkshopStatusActions workshopId={workshop.id} status={workshop.status} />
      </div>

      {(notice.created || notice.saved) && (
        <p className="mt-7 rounded-xl bg-[#e7f4d4] px-5 py-4 text-sm font-semibold text-[#315c24]" role="status">
          {notice.created ? "Draft created. Review it, then publish when it is ready." : "Changes saved."}
        </p>
      )}

      {workshop.status === "canceled" ? (
        <div className="mt-8 rounded-2xl border border-[#dce1d6] bg-white p-8">
          <p className="text-[#596760]">Canceled workshops are retained for organizer records and cannot be edited or republished.</p>
          <Link href="/organizer" className="mt-5 inline-flex font-bold text-[#315b47] hover:underline">Back to dashboard</Link>
        </div>
      ) : (
        <WorkshopForm defaults={{
          id: workshop.id,
          title: workshop.title,
          summary: workshop.summary,
          description: workshop.description,
          category: workshop.category,
          startsAtLocal: dateToLocalInput(workshop.startsAt, workshop.timeZone),
          endsAtLocal: dateToLocalInput(workshop.endsAt, workshop.timeZone),
          timeZone: workshop.timeZone,
          venue: workshop.venue,
          address: workshop.address,
          capacity: workshop.capacity,
          learningPointsText: workshop.learningPoints.join("\n"),
        }} />
      )}
    </div>
  );
}
