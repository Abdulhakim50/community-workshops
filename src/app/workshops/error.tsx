"use client";

import Link from "next/link";

export default function WorkshopsError({ reset }: { reset: () => void }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8 md:py-28">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#537b26]">Workshops unavailable</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">We could not load workshops.</h1>
      <p className="mx-auto mt-5 max-w-lg leading-7 text-[#596760]">Please try again in a moment.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="min-h-11 rounded-full bg-[#203e32] px-6 py-2 text-sm font-bold text-white hover:bg-[#315b47]">Try again</button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-[#b8c8b2] px-6 py-2 text-sm font-bold hover:bg-[#eff3e9]">Back to home</Link>
      </div>
    </section>
  );
}
