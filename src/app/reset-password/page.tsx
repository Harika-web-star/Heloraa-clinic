"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword, PASSWORD_HELP } from "@/lib/auth/password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();
    setError("");
    setSuccess("");

    if (!isStrongPassword(password)) {
      setError(PASSWORD_HELP);
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess("Your password has been updated. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.replace("/login"), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0D14] font-bold text-white">H</div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Create a strong password for your Heloraa Clinic account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100" />
            <p className="mt-2 text-xs text-slate-500">{PASSWORD_HELP}</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input id="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100" />
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {success && <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#0A0D14] py-3.5 font-medium text-white hover:bg-black disabled:opacity-50">{loading ? "Updating password..." : "Update password"}</button>
        </form>
      </section>
    </main>
  );
}
