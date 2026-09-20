import type { Metadata } from "next";
import Link from "next/link";
import {
  formatWorkshopDate,
  formatWorkshopTime,
  getAvailableSeats,
  getPublishedWorkshops,
} from "@/lib/workshops";

export const metadata: Metadata = {
  title: "Workshops",
  description: "Explore hands-on community workshops and see the details for each session.",
};

export default function WorkshopsPage() {
  const workshops = getPublishedWorkshops();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#537b26]">Explore</p>
      <h1 className="text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Workshops</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#596760]">
        Find a small session and learn something with your community.
      </p>

      {workshops.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-[#b8c8b2] bg-[#eff3e9] px-6 py-16 text-center sm:px-10">
          <p className="mb-3 text-3xl" aria-hidden="true">✳</p>
          <h2 className="text-2xl font-bold tracking-tight">No workshops published yet</h2>
          <p className="mx-auto mt-3 max-w-md leading-7 text-[#596760]">
            Check back soon for new sessions from community organizers.
          </p>
          <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#203e32] px-5 py-2 text-sm font-bold text-white hover:bg-[#315b47]">
            Back to home <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-10 rounded-xl border border-[#dce1d6] bg-[#eff3e9] px-5 py-4 text-sm leading-6 text-[#405549]">
            <strong>Sample schedule:</strong> These workshops are example content while we build organizer publishing and registration. Seats shown are illustrative; booking is not open yet.
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {workshops.map((workshop) => {
              const availableSeats = getAvailableSeats(workshop);

              return (
                <article key={workshop.slug} className="flex flex-col rounded-2xl border border-[#dce1d6] bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#537b26]">{workshop.category}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${availableSeats > 0 ? "bg-[#e7f4d4] text-[#315c24]" : "bg-[#f2e6dc] text-[#84502e]"}`}>
                      {availableSeats > 0 ? `${availableSeats} sample seats left` : "Sample session full"}
                    </span>
                  </div>
                  <h2 className="mt-5 text-2xl font-bold tracking-[-0.035em]">
                    <Link href={`/workshops/${workshop.slug}`} className="hover:text-[#537b26]">{workshop.title}</Link>
                  </h2>
                  <p className="mt-3 leading-7 text-[#596760]">{workshop.summary}</p>
                  <dl className="mt-7 space-y-2 border-t border-[#e5e9df] pt-5 text-sm text-[#405549]">
                    <div className="flex gap-2"><dt className="font-semibold">When:</dt><dd>{formatWorkshopDate(workshop)}, {formatWorkshopTime(workshop)}</dd></div>
                    <div className="flex gap-2"><dt className="font-semibold">Where:</dt><dd>{workshop.venue}</dd></div>
                  </dl>
                  <Link href={`/workshops/${workshop.slug}`} className="mt-7 inline-flex min-h-11 items-center self-start rounded-full bg-[#203e32] px-5 py-2 text-sm font-bold text-white hover:bg-[#315b47]">
                    View details <span className="ml-2" aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
