import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workshops",
  description: "Explore upcoming community workshops.",
};

export default function WorkshopsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-24">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#537b26]">Explore</p>
      <h1 className="text-4xl font-bold tracking-[-0.05em] sm:text-5xl">Workshops</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[#596760]">Find a small session and learn something with your community.</p>
      <div className="mt-12 rounded-2xl border border-dashed border-[#b8c8b2] bg-[#eff3e9] px-6 py-16 text-center sm:px-10">
        <p className="mb-3 text-3xl" aria-hidden="true">✳</p>
        <h2 className="text-2xl font-bold tracking-tight">No workshops published yet</h2>
        <p className="mx-auto mt-3 max-w-md leading-7 text-[#596760]">This is the first working version of the site. Published workshops will appear here as we build the workshop management flow.</p>
        <Link href="/" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#203e32] px-5 py-2 text-sm font-bold text-white hover:bg-[#315b47]">Back to home <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  );
}
