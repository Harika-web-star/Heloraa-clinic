import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Current doctor
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  // Patient
  const { data: patient } = await supabase
    .from("patients")
    .select(`
      *,
      profiles (
        full_name,
        email,
        phone
      )
    `)
    .eq("id", id)
    .eq("assigned_doctor_id", doctor?.id)
    .single();

  if (!patient) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">

        <div className="mx-auto max-w-4xl">

          <div className="rounded-2xl border border-slate-200 bg-white p-8">

            <h1 className="text-2xl font-semibold">
              Patient not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This patient is not assigned to your account or
              could not be found.
            </p>

            <Link
              href="/doctor"
              className="mt-6 inline-flex rounded-xl bg-[#0A0D14] px-5 py-3 text-sm font-medium text-white"
            >
              ← Back to Dashboard
            </Link>

          </div>

        </div>

      </main>
    );
  }

  // Medical records
  const { data: records } = await supabase
    .from("medical_records")
    .select("*")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });

  // Medications
  const { data: medications } = await supabase
    .from("medications")
    .select("*")
    .eq("patient_id", patient.id)
    .eq("active", true);

  // Appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .order("appointment_date", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F8FAFC]">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">

          <Link
            href="/doctor"
            className="text-sm text-slate-500 hover:text-[#0A0D14]"
          >
            ← Back to Doctor Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

        {/* =================================================
            PATIENT HEADER
        ================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0A0D14] text-xl font-semibold text-white">
                {patient.profiles?.full_name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div>

                <p className="text-sm text-slate-500">
                  Patient Profile
                </p>

                <h1 className="mt-1 text-2xl font-semibold">
                  {patient.profiles?.full_name}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {patient.profiles?.email}
                </p>

              </div>

            </div>

            {/* AI ACTIONS */}

            <div className="flex flex-wrap gap-3">

              <Link
                href={`/doctor/patients/${patient.id}/summary`}
                className="inline-flex items-center rounded-xl bg-[#0A0D14] px-4 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                ✦ AI Clinical Summary
              </Link>

              <Link
                href={`/doctor/patients/${patient.id}/risk`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50"
              >
                ◉ Risk Analysis
              </Link>

            </div>

          </div>

          {/* Patient information */}

          <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-5">

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Date of Birth
              </p>

              <p className="mt-1 font-medium">
                {patient.date_of_birth || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Gender
              </p>

              <p className="mt-1 font-medium">
                {patient.gender || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Blood Group
              </p>

              <p className="mt-1 font-medium">
                {patient.blood_group || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <p className="mt-1 font-medium">
                {patient.profiles?.phone || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Records
              </p>

              <p className="mt-1 font-medium">
                {records?.length || 0}
              </p>
            </div>

          </div>

        </section>

        {/* =================================================
            QUICK CLINICAL ACTIONS
        ================================================== */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <Link
            href={`/doctor/patients/${patient.id}/summary`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              ✦
            </div>

            <h2 className="mt-4 font-semibold">
              AI Clinical Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Generate an AI-assisted summary from available clinical information.
            </p>

          </Link>

          <Link
            href={`/doctor/patients/${patient.id}/risk`}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              !
            </div>

            <h2 className="mt-4 font-semibold">
              Risk Alerts
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Run AI-powered risk analysis for this patient.
            </p>

          </Link>

          <a
            href="#appointments"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              ◷
            </div>

            <h2 className="mt-4 font-semibold">
              Appointments
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the patient's consultation history.
            </p>

          </a>

        </section>

        {/* =================================================
            MEDICAL RECORDS
        ================================================== */}

        <section className="mt-10" id="records">

          <div>

            <h2 className="text-xl font-semibold">
              Medical Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Clinical history, diagnosis, treatment and vitals.
            </p>

          </div>

          <div className="mt-5 space-y-4">

            {records?.map((record) => (

              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {record.record_type}
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      {record.title}
                    </h3>

                  </div>

                  <span className="text-xs text-slate-400">
                    {new Date(record.created_at).toLocaleDateString("en-IN")}
                  </span>

                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {record.description || "No description available."}
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Assessment
                    </p>

                    <p className="mt-2 text-sm font-medium">
                      {record.diagnosis || "No diagnosis recorded"}
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Treatment
                    </p>

                    <p className="mt-2 text-sm">
                      {record.treatment || "No treatment recorded"}
                    </p>

                  </div>

                </div>

                {record.vitals && (

                  <div className="mt-5 flex flex-wrap gap-3">

                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs">
                      ❤️ {record.vitals.heart_rate || "—"} BPM
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs">
                      BP {record.vitals.blood_pressure || "—"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-2 text-xs">
                      🌡 {record.vitals.temperature || "—"}
                    </span>

                  </div>

                )}

              </div>

            ))}

            {!records?.length && (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">

                <p className="font-medium">
                  No medical records
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No clinical records are currently available for this patient.
                </p>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            MEDICATIONS
        ================================================== */}

        <section className="mt-10">

          <h2 className="text-xl font-semibold">
            Active Medications
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current medications associated with this patient.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            {medications?.map((medication) => (

              <div
                key={medication.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >

                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="font-semibold">
                      {medication.medication_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {medication.dosage} · {medication.frequency}
                    </p>

                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                    Active
                  </span>

                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {medication.instructions || "No instructions recorded."}
                </p>

              </div>

            ))}

            {!medications?.length && (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">

                <p className="text-sm text-slate-500">
                  No active medications.
                </p>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            APPOINTMENTS
        ================================================== */}

        <section
          id="appointments"
          className="mt-10 scroll-mt-24"
        >

          <div>

            <h2 className="text-xl font-semibold">
              Appointment History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Previous and upcoming consultations.
            </p>

          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">

            {appointments?.map((appointment, index) => (

              <div
                key={appointment.id}
                className={`p-5 ${
                  index !== appointments.length - 1
                    ? "border-b border-slate-200"
                    : ""
                }`}
              >

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>

                    <h3 className="font-semibold">
                      {appointment.appointment_type}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.reason || "No reason provided"}
                    </p>

                  </div>

                  <div className="flex items-center gap-4">

                    <div className="text-right">

                      <p className="text-sm font-medium">
                        {appointment.appointment_date}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {appointment.appointment_time}
                      </p>

                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium">
                      {appointment.status}
                    </span>

                  </div>

                </div>

              </div>

            ))}

            {!appointments?.length && (

              <div className="p-10 text-center">

                <p className="font-medium">
                  No appointments
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No appointment history is available.
                </p>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            BOTTOM AI PANEL
        ================================================== */}

        <section className="mt-10 rounded-2xl bg-[#0A0D14] p-6 text-white">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-xs uppercase tracking-wider text-slate-400">
                Heloraa AI
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Clinical Intelligence
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Use the AI clinical summary and risk analysis tools
                to assist with reviewing this patient's available
                healthcare information.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              <Link
                href={`/doctor/patients/${patient.id}/summary`}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-[#0A0D14] hover:bg-slate-100"
              >
                Generate Summary
              </Link>

              <Link
                href={`/doctor/patients/${patient.id}/risk`}
                className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
              >
                Run Risk Analysis
              </Link>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}