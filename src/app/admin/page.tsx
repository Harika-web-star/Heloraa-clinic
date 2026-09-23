import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // =========================================================
  // DASHBOARD COUNTS
  // =========================================================

  const [
    { count: patientCount },
    { count: doctorCount },
    { count: appointmentCount },
    { count: aiInteractionCount },
  ] = await Promise.all([
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("doctors")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("ai_interactions")
      .select("*", { count: "exact", head: true }),
  ]);

  // =========================================================
  // TODAY
  // =========================================================

  const today = new Date().toISOString().split("T")[0];

  // =========================================================
  // UPCOMING APPOINTMENTS
  // =========================================================

  const { data: appointments } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      appointment_time,
      appointment_type,
      status,
      reason,
      patients (
        profile_id,
        profiles (
          full_name
        )
      ),
      doctors (
        profile_id,
        profiles (
          full_name
        ),
        specialization
      )
    `)
    .gte("appointment_date", today)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true })
    .limit(6);

  // =========================================================
  // AI AGENT ACTIVITY
  // =========================================================

  const { data: aiInteractions } = await supabase
    .from("ai_interactions")
    .select(`
      id,
      agent_name,
      input_text,
      output_text,
      created_at,
      metadata
    `)
    .order("created_at", { ascending: false })
    .limit(8);

  // =========================================================
  // AI FLAGS
  // =========================================================

  const { data: rawAiFlags } = await supabase
    .from("ai_flags")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  // Remove duplicate AI flags
  const uniqueFlags: any[] = [];
  const seenFlags = new Set<string>();

  for (const flag of rawAiFlags || []) {
    const text =
      flag.description ||
      flag.message ||
      flag.flag_type ||
      flag.type ||
      JSON.stringify(flag);

    const normalizedText = text
      .toString()
      .trim()
      .toLowerCase();

    if (!seenFlags.has(normalizedText)) {
      seenFlags.add(normalizedText);
      uniqueFlags.push(flag);
    }

    if (uniqueFlags.length >= 5) {
      break;
    }
  }

  // =========================================================
  // AUTOMATION LOGS
  // =========================================================
  //
  // IMPORTANT:
  // automation_logs does NOT have created_at.
  // Therefore we do NOT order by created_at here.
  //
  // We use the service-role client because these logs are
  // written by server-side n8n automation.
  // =========================================================

  let automationLogs: any[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    const adminSupabase = createSupabaseAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: automationData,
      error: automationError,
    } = await adminSupabase
      .from("automation_logs")
      .select("*")
      .limit(8);

    if (automationError) {
      console.error(
        "ADMIN AUTOMATION LOG ERROR:",
        automationError.message
      );
    } else {
      automationLogs = automationData || [];
    }
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function formatAgentName(agentName: string | null) {
    if (!agentName) {
      return "AI Agent";
    }

    return agentName
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDateTime(value: string | null) {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatAppointmentDate(date: string) {
    if (!date) {
      return "";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-medium text-slate-500">
              Heloraa Clinic
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0A0D14]">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor healthcare operations, AI activity, and automation.
            </p>
          </div>

          <LogoutButton />

        </div>

        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Patients
            </p>

            <p className="mt-2 text-3xl font-semibold text-[#0A0D14]">
              {patientCount || 0}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Registered patients
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Doctors
            </p>

            <p className="mt-2 text-3xl font-semibold text-[#0A0D14]">
              {doctorCount || 0}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Healthcare providers
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Appointments
            </p>

            <p className="mt-2 text-3xl font-semibold text-[#0A0D14]">
              {appointmentCount || 0}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Total appointments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              AI Interactions
            </p>

            <p className="mt-2 text-3xl font-semibold text-[#0A0D14]">
              {aiInteractionCount || 0}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              AI agent activity
            </p>
          </div>

        </section>

        {/* =====================================================
            APPOINTMENTS + AI ACTIVITY
        ====================================================== */}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* UPCOMING APPOINTMENTS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-semibold text-[#0A0D14]">
                  Upcoming Appointments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Today&apos;s and upcoming consultations.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {appointments?.length || 0}
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {appointments?.map((appointment: any) => (

                <div
                  key={appointment.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="min-w-0">

                      <p className="font-medium text-[#0A0D14]">
                        {appointment.patients?.profiles?.full_name ||
                          "Patient"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {appointment.doctors?.profiles?.full_name ||
                          "Doctor"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {appointment.doctors?.specialization ||
                          "General Medicine"}
                      </p>

                    </div>

                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs capitalize text-slate-600">
                      {appointment.status || "scheduled"}
                    </span>

                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">

                    <span>
                      {formatAppointmentDate(
                        appointment.appointment_date
                      )}
                    </span>

                    <span>·</span>

                    <span>
                      {appointment.appointment_time}
                    </span>

                  </div>

                  {appointment.reason && (
                    <p className="mt-2 text-xs text-slate-400">
                      {appointment.reason}
                    </p>
                  )}

                </div>

              ))}

              {!appointments?.length && (
                <div className="rounded-xl bg-slate-50 p-8 text-center">

                  <p className="text-sm font-medium text-slate-600">
                    No upcoming appointments
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    There are no scheduled consultations.
                  </p>

                </div>
              )}

            </div>

          </div>

          {/* AI ACTIVITY */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-semibold text-[#0A0D14]">
                  AI Agent Activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Recent activity across Heloraa AI agents.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Live
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {aiInteractions?.map((interaction) => (

                <div
                  key={interaction.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >

                  <div className="flex items-center justify-between gap-3">

                    <p className="font-medium text-[#0A0D14]">
                      {formatAgentName(
                        interaction.agent_name
                      )}
                    </p>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      Completed
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {formatDateTime(
                      interaction.created_at
                    )}
                  </p>

                </div>

              ))}

              {!aiInteractions?.length && (
                <div className="rounded-xl bg-slate-50 p-8 text-center">

                  <p className="text-sm font-medium text-slate-600">
                    No AI activity found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    AI agent interactions will appear here.
                  </p>

                </div>
              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            AI FLAGS
        ====================================================== */}

        <section className="mt-6">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-semibold text-[#0A0D14]">
                  AI Flags
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cases requiring administrative or clinical attention.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {uniqueFlags.length} active
              </span>

            </div>

            <div className="mt-5">

              {uniqueFlags.length > 0 ? (

                <div className="space-y-3">

                  {uniqueFlags.map((flag: any) => (

                    <div
                      key={flag.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <p className="font-medium text-[#0A0D14]">
                            {flag.flag_type ||
                              flag.type ||
                              "AI Alert"}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {flag.description ||
                              flag.message ||
                              "Review required."}
                          </p>

                        </div>

                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-600">
                          {flag.status || "open"}
                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="rounded-xl bg-slate-50 p-8 text-center">

                  <div className="text-2xl">
                    ✓
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    No active AI flags
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    No cases currently require attention.
                  </p>

                </div>

              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            AUTOMATION ACTIVITY
        ====================================================== */}

        <section className="mt-6">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>

                <h2 className="text-lg font-semibold text-[#0A0D14]">
                  Automation Activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  n8n workflows and automated operations.
                </p>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                n8n
              </span>

            </div>

            <div className="mt-5 space-y-3">

              {automationLogs.length > 0 ? (

                automationLogs.map((log: any) => (

                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <div className="min-w-0">

                        <p className="font-medium text-[#0A0D14]">
                          {log.workflow_name ||
                            "Automation Workflow"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {log.trigger_type || "n8n"}
                        </p>

                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                          log.status === "success"
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600"
                        }`}
                      >
                        {log.status || "success"}
                      </span>

                    </div>

                    {log.reference_id && (
                      <p className="mt-2 text-xs text-slate-400">
                        Reference: {log.reference_id}
                      </p>
                    )}

                    {log.details && (
                      <p className="mt-2 text-xs text-slate-400">
                        {typeof log.details === "string"
                          ? log.details
                          : JSON.stringify(log.details)}
                      </p>
                    )}

                  </div>

                ))

              ) : (

                <div className="rounded-xl bg-slate-50 p-8 text-center">

                  <div className="text-2xl">
                    ⟳
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-600">
                    No automation activity found
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Successful n8n workflow executions will appear here.
                  </p>

                </div>

              )}

            </div>

          </div>

        </section>

        {/* =====================================================
            AI INFRASTRUCTURE
        ====================================================== */}

        <section className="mt-6">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-lg font-semibold text-[#0A0D14]">
                  Heloraa AI Infrastructure
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Intelligent healthcare system components.
                </p>

              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Operational
              </span>

            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-[#0A0D14]">
                  Medical Assistant
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  LLM + RAG
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-[#0A0D14]">
                  Medical Records
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  RAG-enabled
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-[#0A0D14]">
                  Risk Monitoring
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  AI-powered
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-[#0A0D14]">
                  Automation
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  n8n workflows
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="mt-8 border-t border-slate-200 pt-5">

          <p className="text-xs text-slate-400">
            Heloraa Clinic · Admin Operations
          </p>

        </div>

      </div>
    </main>
  );
}