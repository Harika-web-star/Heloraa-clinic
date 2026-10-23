
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getPasswordRequirements,
  isStrongPassword,
  PASSWORD_HELP,
} from "@/lib/auth/password";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requirements = getPasswordRequirements(password);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createClient();
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError(PASSWORD_HELP);
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/patient`,
            data: {
              full_name: fullName.trim(),
              role: "patient",
            },
          },
        });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (!data.user) {
        setError("We couldn't create your account. Please try again.");
        return;
      }

      if (data.session) {
        router.replace("/patient");
        router.refresh();
        return;
      }

      setSuccess(
        "Your account was created! Check your email and click the confirmation link to activate your account. If you don't see it, check your spam folder."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A0D14] font-bold text-white">
              H
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-slate-900">
              {success ? "Check your email" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {success
                ? `We sent a confirmation link to ${email.trim().toLowerCase()}.`
                : "Create a secure Heloraa Clinic patient account."}
            </p>
          </div>

          {!success && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="fullName"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  autoComplete="new-password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#0A0D14] focus:ring-2 focus:ring-slate-100"
                />
                <p className="mt-2 text-xs text-slate-500">{PASSWORD_HELP}</p>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  {([
                    ["length", "8+ characters"],
                    ["lowercase", "Lowercase letter"],
                    ["uppercase", "Uppercase letter"],
                    ["special", "Symbol"],
                  ] as const).map(([key, label]) => (
                    <li
                      key={key}
                      className={requirements[key] ? "text-emerald-700" : "text-slate-400"}
                    >
                      {requirements[key] ? "✓" : "○"} {label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Patient accounts can be created here. Doctor accounts are provisioned by clinic administration to protect access to clinical data.
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#0A0D14] py-3.5 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          {success && (
            <div role="status" className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                {success}
              </div>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full rounded-xl bg-[#0A0D14] py-3.5 font-medium text-white hover:bg-black"
              >
                Go to sign in
              </button>
            </div>
          )}

          <div className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-semibold text-slate-900 hover:underline"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
