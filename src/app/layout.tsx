import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Community Workshops",
    template: "%s | Community Workshops",
  },
  description: "A simple home for small, in-person community workshops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only rounded-md bg-[#d7f38a] px-4 py-2 text-[#17231f] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-[#dce1d6] bg-[#f8f6f0]">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:flex-nowrap sm:px-8">
              <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#203e32] text-xl text-[#d7f38a]" aria-hidden="true">
                  ✳
                </span>
                <span>Community Workshops</span>
              </Link>
              <nav aria-label="Main navigation" className="flex w-full items-center justify-between gap-5 text-sm font-semibold sm:w-auto sm:justify-start sm:gap-8">
                <Link href="/" className="hover:text-[#537b26]">Home</Link>
                <Link href="/workshops" className="hover:text-[#537b26]">Workshops</Link>
              </nav>
            </div>
          </header>
          <main id="main-content" className="flex-1">{children}</main>
          <footer className="border-t border-[#dce1d6] bg-[#f8f6f0]">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-7 text-sm text-[#596760] sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p>Community Workshops</p>
              <p>Make room to learn together.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
