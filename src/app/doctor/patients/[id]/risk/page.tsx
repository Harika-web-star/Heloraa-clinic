"use client";

import { useEffect, useState } from "react";

type RiskPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RiskFlag = {
  id: string;
  priority: string;
  title: string;
  description: string;
  status: string;
};

export default function RiskPage({ params }: RiskPageProps) {
  const [patientId, setPatientId] = useState("");
  const [flag, setFlag] = useState<RiskFlag | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [ragSources, setRagSources] = useState(0);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setPatientId(resolvedParams.id);
      setPageLoading(false);
    }

    loadParams();
  }, [params]);

  async function runRiskAgent() {
    if (!patientId) return;

    setLoading(true);
    setError("");
    setMessage("");
    setFlag(null);

    try {
      const response = await fetch("/api/ai/risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Risk analysis failed");
      }

      setRagSources(data.rag?.sources?.length || 0);

      if (data.flag) {
        setFlag(data.flag);
      } else {
        setMessage(data.message || "No review flag identified.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">
        <p className="text-sm text-slate-500">
          Loading patient...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm font-medium text-slate-500">
            Heloraa Clinic
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#0A0D14]">
            AI Risk Monitoring
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review documented patient information for items that may
            require doctor attention.
          </p>
        </div>

        {/* Action */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">
                  Risk Monitoring Agent
                </p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  Gemini + RAG
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Reviews records, vitals, active medications and semantically retrieved history.
                {ragSources > 0 ? ` ${ragSources} relevant record${ragSources === 1 ? "" : "s"} retrieved.` : ""}
              </p>
            </div>

            <button
              onClick={runRiskAgent}
              disabled={loading}
              className="rounded-xl bg-[#0A0D14] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Analyzing..."
                : "✦ Run Risk Analysis"}
            </button>

          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* No Flag */}
        {message && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                ✓
              </div>

              <div>
                <h2 className="font-semibold text-[#0A0D14]">
                  No review flag identified
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The agent did not identify a meaningful review
                  item from the available documented information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Risk Flag */}
        {flag && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  AI Review Flag
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#0A0D14]">
                  {flag.title}
                </h2>
              </div>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                {flag.priority}
              </span>

            </div>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Observation
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {flag.description}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Suggested Review
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {flag.description}
                </p>
              </div>

            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs leading-5 text-slate-500">
                This flag is an AI-generated review aid based only
                on documented patient information. It does not
                constitute a diagnosis or treatment recommendation.
              </p>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}