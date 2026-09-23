import { embedTexts } from "./gemini";
import { createClient } from "@/lib/supabase/server";

type MedicalRecord = {
  id: string;
  patient_id: string;
  record_type?: string | null;
  title?: string | null;
  description?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  vitals?: unknown;
  created_at?: string | null;
};

function recordToText(record: MedicalRecord) {
  return [
    `Record type: ${record.record_type || "Not specified"}`,
    `Title: ${record.title || "Not specified"}`,
    `Description: ${record.description || "Not specified"}`,
    `Documented diagnosis: ${record.diagnosis || "Not specified"}`,
    `Documented treatment: ${record.treatment || "Not specified"}`,
    `Vitals: ${JSON.stringify(record.vitals || {})}`,
    `Date: ${record.created_at || "Not specified"}`,
  ].join("\n");
}

export async function syncMedicalRecordEmbeddings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  records: MedicalRecord[]
) {
  if (!records.length) return;

  const { data: existing, error: existingError } = await supabase
    .from("medical_record_embeddings")
    .select("record_id")
    .eq("patient_id", patientId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set(
    (existing || []).map((row: { record_id: string }) => row.record_id)
  );

  const missing = records.filter(
    (record) => !existingIds.has(record.id)
  );

  if (!missing.length) return;

  const embeddings = await embedTexts(
    missing.map(recordToText),
    "RETRIEVAL_DOCUMENT"
  );

  const rows = missing.map((record, index) => ({
    record_id: record.id,
    patient_id: patientId,
    content: recordToText(record),
    embedding: embeddings[index],
    metadata: {
      record_type: record.record_type || null,
      title: record.title || null,
      created_at: record.created_at || null,
    },
  }));

  const { error } = await supabase
    .from("medical_record_embeddings")
    .upsert(rows, { onConflict: "record_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function retrieveMedicalContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
  question: string,
  limit = 5
) {
  const [queryEmbedding] = await embedTexts(
    [question],
    "RETRIEVAL_QUERY"
  );

  const { data, error } = await supabase.rpc(
    "match_medical_record_embeddings",
    {
      query_embedding: queryEmbedding,
      match_patient_id: patientId,
      match_count: limit,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Array<{
    record_id: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>;
}
