"use client";

import { useEffect, useState } from "react";

type PatientSummaryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}): ${text.slice(
        0,
        300
      )}`
    );
  }
}

export default function PatientSummaryPage({
  params,
}: PatientSummaryPageProps) {
  const [patientId, setPatientId] = useState("");
  const [summary, setSummary] = useState("");
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [ragSources, setRagSources] = useState(0);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setPatientId(resolvedParams.id);
      setPageLoading(false);
    }

    loadParams();
  }, [params]);

  async function generateSummary() {
    if (!patientId) return;

    setLoading(true);
    setError("");
    setSummary("");
    setPatientName("");
    setRagSources(0);

    try {
      const response = await fetch("/api/ai/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            `Failed to generate summary. HTTP ${response.status}`
        );
      }

      if (!data?.summary) {
        throw new Error(
          "The Medical Records Agent returned no clinical summary."
        );
      }

      setSummary(data.summary);
      setPatientName(data.patient?.name || "Patient");
      setRagSources(data.rag?.sources?.length || 0);
    } catch (err) {
      console.error("CLINICAL SUMMARY ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the summary."
      );
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading patient...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <div>
          <p className="text-sm font-medium text-slate-500">
            Heloraa Clinic
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0A0D14]">
            AI Clinical Summary
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Transform the patient&apos;s documented medical history into a
            concise clinical summary.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900">
                  Medical Records Agent
                </p>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                  Groq + RAG
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Uses documented records, medications, vitals and semantic
                retrieval.
                {ragSources > 0
                  ? ` ${ragSources} relevant record${
                      ragSources === 1 ? "" : "s"
                    } retrieved.`
                  : ""}
              </p>
            </div>

            <button
              onClick={generateSummary}
              disabled={loading}
              className="rounded-xl bg-[#0A0D14] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating..." : "✦ Generate Summary"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {summary && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Clinical Summary
              </p>

              <h2 className="mt-1 text-xl font-semibold text-[#0A0D14]">
                {patientName}
              </h2>
            </div>

            <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
              {summary}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs leading-5 text-slate-500">
            AI-generated content is intended to support clinical review.
            It summarizes documented information and does not replace
            professional medical judgment.
          </p>
        </div>

      </div>
    </main>
  );
}