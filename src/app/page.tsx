import Link from "next/link";

const steps = [
  { number: "01", title: "Find a workshop", description: "Browse small, in-person sessions and read what you will learn." },
  { number: "02", title: "Save your seat", description: "Register while places are open, or join the waitlist if a session is full." },
  { number: "03", title: "Show up and learn", description: "Keep your details handy and check in with the organizer on the day." },
];

export default function Home() {
  return (
    <>
      <section className="overflow-hidden bg-[#e9eee2]">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-28">
          <div>
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.22em] text-[#537b26]">Local learning, together</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-[-0.055em] text-[#17231f] sm:text-6xl lg:text-7xl">
              A good workshop starts with a place for everyone.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#4f6057]">
              Discover hands-on sessions in your community. See the details, reserve a seat, and know where you stand if a workshop fills up.
            </p>
            <Link href="/workshops" className="mt-9 inline-flex min-h-12 items-center gap-4 rounded-full bg-[#203e32] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#315b47]">
              Explore workshops <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div aria-hidden="true" className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-[2rem] bg-[#d7f38a] p-8 shadow-[20px_20px_0_#cad8b7]">
            <div className="w-full rotate-[-5deg] rounded-2xl bg-[#203e32] p-7 text-[#f6f8ee] shadow-2xl">
              <div className="mb-12 flex items-center justify-between text-xs text-[#d7f38a]"><span>COMMUNITY / 001</span><span>✳</span></div>
              <p className="text-3xl font-bold leading-tight tracking-tight">A seat at the table.</p>
              <div className="mt-8 h-2 w-4/5 rounded-full bg-[#719077]" />
              <div className="mt-3 h-2 w-3/5 rounded-full bg-[#719077]" />
              <div className="mt-9 flex gap-2"><span className="h-10 w-10 rounded-full bg-[#e7a893]" /><span className="h-10 w-10 rounded-full bg-[#f1d997]" /><span className="grid h-10 w-10 place-items-center rounded-full bg-[#d7f38a] text-sm font-bold text-[#203e32]">+</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 md:py-24">
        <div className="mb-10 max-w-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#537b26]">How it works</p>
          <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">A simple path from interest to attendance.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.number} className="rounded-2xl border border-[#dce1d6] bg-white p-7">
              <p className="mb-12 text-sm font-bold text-[#537b26]">{step.number}</p>
              <h3 className="mb-3 text-xl font-bold tracking-tight">{step.title}</h3>
              <p className="leading-7 text-[#596760]">{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
