import Link from "next/link";

export default function WorkshopNotFound() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 text-center sm:px-8 md:py-28">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#537b26]">Unavailable workshop</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] sm:text-5xl">We could not find that workshop.</h1>
      <p className="mx-auto mt-5 max-w-lg leading-7 text-[#596760]">The link may be incorrect, or the workshop may no longer be published.</p>
      <Link href="/workshops" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[#203e32] px-6 py-2 text-sm font-bold text-white hover:bg-[#315b47]">Browse workshops</Link>
    </section>
  );
}
