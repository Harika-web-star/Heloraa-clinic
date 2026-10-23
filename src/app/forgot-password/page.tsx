"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSuccess("If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't request a reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0D14] font-bold text-white">H</div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Enter the email address associated with your Heloraa Clinic account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100" />
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {success && <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#0A0D14] py-3.5 font-medium text-white hover:bg-black disabled:opacity-50">{loading ? "Sending link..." : "Send reset link"}</button>
        </form>
        <button type="button" onClick={() => router.push("/login")} className="mt-6 w-full text-sm font-semibold text-slate-600 hover:underline">Back to sign in</button>
      </section>
    </main>
  );
}
