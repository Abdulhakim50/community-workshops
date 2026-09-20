export default function WorkshopsLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-24" aria-label="Loading workshops" role="status">
      <div className="h-3 w-24 animate-pulse rounded bg-[#dce1d6]" />
      <div className="mt-5 h-12 w-64 max-w-full animate-pulse rounded bg-[#dce1d6]" />
      <div className="mt-5 h-6 w-full max-w-xl animate-pulse rounded bg-[#dce1d6]" />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-[#eff3e9]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[#eff3e9]" />
      </div>
      <span className="sr-only">Loading workshops…</span>
    </section>
  );
}
