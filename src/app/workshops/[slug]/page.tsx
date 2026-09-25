import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicWorkshopBySlug } from "@/lib/public-workshops";
import {
  formatWorkshopDate,
  formatWorkshopTime,
  getAvailableSeats,
} from "@/lib/workshops";
import { RegistrationForm } from "./registration-form";
import { canAcceptAttendees } from "@/lib/workshop-eligibility";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const workshop = await getPublicWorkshopBySlug(slug);

  if (!workshop) {
    notFound();
  }

  return { title: workshop.title, description: workshop.summary };
}

export default async function WorkshopDetailPage({ params }: Props) {
  const { slug } = await params;
  const workshop = await getPublicWorkshopBySlug(slug);

  if (!workshop) {
    notFound();
  }

  const availableSeats = getAvailableSeats(workshop);

  return (
    <article className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 md:py-20">
      <Link href="/workshops" className="inline-flex min-h-11 items-center text-sm font-bold text-[#315b47] hover:underline">
        <span className="mr-2" aria-hidden="true">←</span> All workshops
      </Link>

      {workshop.isDemo ? (
        <div className="mt-7 rounded-2xl border border-[#dce1d6] bg-[#eff3e9] px-5 py-4 text-sm leading-6 text-[#405549]">
          <strong>Demo workshop:</strong> This event is fictional, and its seat count is illustrative. Registration is disabled for example events.
        </div>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#537b26]">{workshop.category}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.05em] sm:text-5xl">{workshop.title}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-[#4f6057]">{workshop.summary}</p>

          <section className="mt-12 border-t border-[#dce1d6] pt-9" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-2xl font-bold tracking-tight">About this workshop</h2>
            <p className="mt-4 max-w-2xl leading-8 text-[#596760]">{workshop.description}</p>
          </section>

          <section className="mt-10" aria-labelledby="learn-heading">
            <h2 id="learn-heading" className="text-2xl font-bold tracking-tight">What you will learn</h2>
            <ul className="mt-5 space-y-3">
              {workshop.learningPoints.map((point) => (
                <li key={point} className="flex gap-3 leading-7 text-[#405549]">
                  <span className="font-bold text-[#537b26]" aria-hidden="true">✳</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-[#dce1d6] bg-white p-6 shadow-sm sm:p-7" aria-label="Workshop details">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#537b26]">At a glance</p>
          <dl className="mt-6 space-y-5">
            <div><dt className="text-sm font-semibold text-[#596760]">Date and time</dt><dd className="mt-1 font-bold">{formatWorkshopDate(workshop)}<br />{formatWorkshopTime(workshop)}</dd></div>
            <div><dt className="text-sm font-semibold text-[#596760]">Location</dt><dd className="mt-1 font-bold">{workshop.venue}<br /><span className="font-normal text-[#405549]">{workshop.address}</span></dd></div>
            <div><dt className="text-sm font-semibold text-[#596760]">Organizer</dt><dd className="mt-1 font-bold">{workshop.organizer}</dd></div>
            <div><dt className="text-sm font-semibold text-[#596760]">{workshop.isDemo ? "Example availability" : "Availability"}</dt><dd className="mt-1 font-bold">{availableSeats > 0 ? `${availableSeats} of ${workshop.capacity} seats left` : `Full (${workshop.capacity} seats)`}</dd></div>
          </dl>
          {workshop.id && canAcceptAttendees({ ...workshop, status: "published" }) ? (
            <RegistrationForm workshopId={workshop.id} isFull={availableSeats === 0} />
          ) : (
            <p className="mt-7 rounded-xl bg-[#eff3e9] px-4 py-3 text-sm leading-6 text-[#405549]">
              {workshop.isDemo || !workshop.id
                ? "Registration is disabled for this fictional example."
                : "Registration is closed because this workshop has already started."}
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
