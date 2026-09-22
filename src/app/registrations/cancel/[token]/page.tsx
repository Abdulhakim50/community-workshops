import Link from "next/link";
import { getCancellationDetails } from "@/lib/registration";
import { CancellationForm } from "./cancellation-form";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function CancelRegistrationPage({ params }: Props) {
  const { token } = await params;
  const details = /^[A-Za-z0-9_-]{43}$/.test(token)
    ? await getCancellationDetails(token)
    : undefined;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8 md:py-24">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#537b26]">Registration</p>
      <div className="rounded-2xl border border-[#dce1d6] bg-white p-6 shadow-sm sm:p-9">
        {!details || details.registrationStatus === "canceled" ? (
          <>
            <h1 className="text-3xl font-bold tracking-[-0.04em]">This cancellation link is unavailable</h1>
            <p className="mt-4 leading-7 text-[#596760]">The registration is already canceled or this private link is not valid.</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-[-0.04em]">Cancel your registration?</h1>
            <p className="mt-4 leading-7 text-[#596760]">
              {details.attendeeName}, this will cancel your {details.registrationStatus} registration for <strong>{details.workshopTitle}</strong>.
              {details.registrationStatus === "confirmed" ? " If someone is waiting, the first person in line will be promoted immediately." : " You will lose your current place in the waitlist."}
            </p>
            <CancellationForm token={token} />
          </>
        )}
        <Link href="/workshops" className="mt-7 inline-flex text-sm font-bold text-[#315b47] hover:underline">Browse workshops</Link>
      </div>
    </section>
  );
}
