import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function MedicalRecordsPage() {
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

  const { data: records } = await supabase
    .from("medical_records")
    .select("*")
    .eq("patient_id", patient?.id)
    .order("created_at", { ascending: false });

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
              className="flex items-center gap-3 rounded-xl bg-[#0A0D14] px-3 py-3 text-sm font-medium text-white"
            >
              ▣ Medical Records
            </Link>

            <Link
              href="/patient/medications"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100"
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
                Medical Records
              </p>

            </div>

          </header>

          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">

            <p className="text-sm text-slate-500">
              Healthcare
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Medical Records
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View your medical history and clinical records.
            </p>

            <div className="mt-8 space-y-4">

              {records?.map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                  <div className="flex flex-col justify-between gap-4 sm:flex-row">

                    <div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {record.record_type}
                      </span>

                      <h2 className="mt-3 text-lg font-semibold">
                        {record.title}
                      </h2>

                    </div>

                    {record.created_at && (
                      <p className="text-sm text-slate-400">
                        {new Date(
                          record.created_at
                        ).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}

                  </div>

                  {record.description && (
                    <div className="mt-5">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Description
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {record.description}
                      </p>

                    </div>
                  )}

                  {record.diagnosis && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Diagnosis / Assessment
                      </p>

                      <p className="mt-2 text-sm text-slate-700">
                        {record.diagnosis}
                      </p>

                    </div>
                  )}

                </div>
              ))}

              {!records?.length && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">

                  <div className="text-3xl">
                    ▣
                  </div>

                  <h2 className="mt-4 font-semibold">
                    No medical records
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Your medical records will appear here.
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