import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function MedicationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  const { data: medications } = await supabase
    .from("medications")
    .select("*")
    .eq("patient_id", patient?.id)
    .eq("active", true);

  return (
    <main className="page-shell min-h-screen bg-[#F8FAFC] text-[#0A0D14]">
      <div className="flex min-h-screen">

        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">

          <div className="border-b border-slate-100 px-6 py-6">

            <Link href="/patient">

              <p className="text-lg font-semibold">
                Heloraa Clinic
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Patient Portal
              </p>

            </Link>

          </div>

          <nav className="flex-1 px-4 py-6">

            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Overview
            </p>

            <Link
              href="/patient"
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              ⌂ Dashboard
            </Link>

            <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Healthcare
            </p>

            <Link
              href="/patient/appointments"
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              ◷ Appointments
            </Link>

            <Link
              href="/patient/medical-records"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              ▣ Medical Records
            </Link>

            <Link
              href="/patient/medications"
              className="flex items-center gap-3 rounded-xl bg-[#0A0D14] px-3 py-3 text-sm font-medium text-white"
            >
              ✚ Medications
            </Link>

            <Link
              href="/patient/assistant"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              ✦ AI Assistant
            </Link>

            <Link
              href="/patient/notifications"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
            >
              ♢ Notifications
            </Link>

          </nav>

          <div className="border-t border-slate-100 p-4">

            <div className="mb-3 rounded-xl bg-slate-50 p-3">

              <p className="truncate text-sm font-medium">
                {profile?.full_name || "Patient"}
              </p>

              <p className="truncate text-xs text-slate-500">
                {profile?.email || user.email}
              </p>

            </div>

            <LogoutButton />

          </div>

        </aside>

        <div className="min-w-0 flex-1">

          <header className="border-b border-slate-200 bg-white">

            <div className="flex h-16 items-center px-5 sm:px-8">

              <p className="text-sm text-slate-500">
                Medications
              </p>

            </div>

          </header>

          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

            <p className="text-sm text-slate-500">
              Healthcare
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Current Medications
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review your active medications and instructions.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">

              {medications?.map((medication) => (
                <div
                  key={medication.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                      ✚
                    </div>

                    <div className="min-w-0">

                      <h2 className="text-lg font-semibold">
                        {medication.medication_name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {medication.dosage} · {medication.frequency}
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Instructions
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {medication.instructions ||
                        "No instructions provided."}
                    </p>

                  </div>

                  <div className="mt-4">

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      Active
                    </span>

                  </div>

                </div>
              ))}

              {!medications?.length && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center md:col-span-2">

                  <div className="text-3xl">
                    ✚
                  </div>

                  <h2 className="mt-4 font-semibold">
                    No active medications
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your active prescriptions will appear here.
                  </p>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}