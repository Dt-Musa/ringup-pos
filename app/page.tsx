import Link from "next/link";
import Image from "next/image";
import { BrandMark } from "@/components/brand";

const features = [
  {
    title: "Sell at the counter",
    description: "Search for a product, add it to a basket, take payment and print a receipt.",
    badge: "POS",
  },
  {
    title: "Keep stock up to date",
    description: "Manage products and categories, record stock changes and see what is running low.",
    badge: "Products",
  },
  {
    title: "Check your sales",
    description: "Review sales and refunds, see payment methods and export reports when needed.",
    badge: "Reports",
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="RingUp home">
      <BrandMark size={40} />
      <span>
        <span className="block text-xl font-bold tracking-tight text-zinc-950">RingUp</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">Point of sale</span>
      </span>
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 10h12m-5-5 5 5-5 5" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] text-[#17211d]">
      <div className="mx-auto w-full max-w-[1040px] px-5 pb-10 sm:px-8">
        <header className="flex items-center justify-between gap-3 py-5 sm:py-[18px]">
          <Brand />
          <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Public navigation">
            <Link href="/login" className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800">
              Sign in
            </Link>
          </nav>
        </header>

        <section className="py-14 text-center text-slate-950 sm:py-20 lg:py-24">
          <div className="px-4">
            <span className="inline-block rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-900">Made for shops</span>
            <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[56px]">
              Sell fast. Stay in stock. See the whole shop.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              RingUp helps your team sell products, manage stock, review sales and keep the day moving from one place.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800">
                Get started
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm sm:mt-8" aria-label="RingUp workspace preview">
          <div className="bg-slate-50 p-3 sm:p-5">
            <div className="relative mx-auto aspect-[1600/795] w-full max-w-[760px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <Image src="/assets/LandingPage/dashboard.jpg" alt="RingUp dashboard showing sample sales, products and stock figures" fill quality={75} sizes="(max-width: 640px) calc(100vw - 2rem), 760px" className="object-contain object-top" />
            </div>
          </div>
          <p className="border-t border-slate-200 px-4 py-2.5 text-center text-xs text-slate-500">Sample figures shown for illustration.</p>
        </section>

        <section id="features" className="mt-[72px] scroll-mt-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">One place to run the day</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Everything your shop needs.</h2>
            <p className="mt-2.5 max-w-xl text-slate-600">The main parts of RingUp work together from the sale to the end-of-day report. Admins, managers and cashiers each get the access they need.</p>
          </div>
          <div className="mt-6 grid gap-3.5 sm:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{feature.badge}</span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="screens" className="mt-16 scroll-mt-6 sm:mt-[72px]">
          <div className="max-w-3xl">
            <div className="w-full">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">How a sale works</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">From product search to receipt.</h2>
              <ul className="mt-6 space-y-4 text-sm">
                <li className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5"><b className="min-w-24 font-semibold text-slate-950">Find a product</b><span className="text-slate-600">Search by name or SKU, or browse by category.</span></li>
                <li className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5"><b className="min-w-24 font-semibold text-slate-950">Build the sale</b><span className="text-slate-600">Change quantities and add a fixed or percentage discount.</span></li>
                <li className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5"><b className="min-w-24 font-semibold text-slate-950">Take payment</b><span className="text-slate-600">Accept Cash, Mobile Money, Card or Bank Transfer.</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="relative isolate mt-[72px] overflow-hidden rounded-3xl px-6 py-12 text-center text-white sm:px-10 sm:py-[52px]">
          <Image src="/assets/LandingPage/hero-image.jpg" alt="Shop checkout counter with a payment terminal" fill quality={75} sizes="(max-width: 640px) 100vw, 1040px" className="absolute inset-0 -z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-emerald-950/80" />
          <h2 className="relative mx-auto max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Make every sale count.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-emerald-50">Sell products, record stock changes and review what happened today.</p>
          <Link href="/login" className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50">
            Get started
            <ArrowIcon />
          </Link>
        </section>

        <footer className="mt-9 flex flex-col items-start justify-between gap-3 border-t border-slate-300 pt-[22px] text-sm text-slate-600 sm:flex-row sm:items-center">
          <Brand />
          <div className="flex flex-col gap-1 sm:items-end">
            <p>Email: hello@ringup.com</p>
            <p>Phone: +256 740 707031</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
