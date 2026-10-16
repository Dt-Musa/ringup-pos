import Link from "next/link";
import ForgotPasswordForm from "./forgot-password-form";
import { BrandMark } from "@/components/brand";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 py-6 max-sm:bg-white sm:py-10">
      <div className="absolute inset-0 max-sm:hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_32%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-black/30 max-sm:border-0 max-sm:p-4 max-sm:shadow-none sm:p-9">
        <div className="mb-7 flex items-center gap-3 sm:mb-8">
          <BrandMark size={48} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">RingUp</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Point of sale</p>
          </div>
        </div>
        <h2 className="text-xl font-bold text-zinc-950">Forgot your password?</h2>
        <p className="mt-1 text-sm font-medium text-slate-600">Enter your email and we’ll send a reset link if an active account matches it.</p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-5 block text-center text-sm font-semibold text-emerald-800 hover:text-emerald-950">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
