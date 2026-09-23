import { createClient } from "@/lib/supabase/server";
import { generateWithGemini } from "@/lib/ai/gemini";
import {
  retrieveMedicalContext,
  syncMedicalRecordEmbeddings,
} from "@/lib/ai/rag";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, profile_id, specialization")
      .eq("profile_id", user.id)
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { error: "Doctor profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const patientId = body.patientId;

    if (!patientId) {
      return NextResponse.json(
        { error: "Patient ID is required" },
        { status: 400 }
      );
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(`
        id,
        profile_id,
        date_of_birth,
        gender,
        blood_group
      `)
      .eq("id", patientId)
      .eq("assigned_doctor_id", doctor.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        {
          error: "Patient not found or not assigned to this doctor",
        },
        { status: 403 }
      );
    }

    const { data: patientProfile, error: profileError } =
      await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", patient.profile_id)
        .single();

    if (profileError || !patientProfile) {
      return NextResponse.json(
        { error: "Patient profile could not be loaded" },
        { status: 500 }
      );
    }

    const { data: records, error: recordsError } = await supabase
      .from("medical_records")
      .select(`
        id,
        patient_id,
        record_type,
        title,
        description,
        diagnosis,
        treatment,
        vitals,
        created_at
      `)
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false });

    if (recordsError) {
      return NextResponse.json(
        { error: recordsError.message },
        { status: 500 }
      );
    }

    const { data: medications, error: medicationsError } =
      await supabase
        .from("medications")
        .select(`
          medication_name,
          dosage,
          frequency,
          instructions,
          active
        `)
        .eq("patient_id", patient.id)
        .eq("active", true);

    if (medicationsError) {
      console.error("MEDICATION ERROR:", medicationsError);
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        summary:
          "No medical records are currently available for this patient.",
        patient: {
          id: patient.id,
          name: patientProfile.full_name || "Patient",
        },
      });
    }

    await syncMedicalRecordEmbeddings(
      supabase,
      patient.id,
      records
    );

    const retrieved = await retrieveMedicalContext(
      supabase,
      patient.id,
      "Summarize the patient's documented medical history, diagnoses, treatments, medications, recent vitals, changes, and items requiring doctor review.",
      8
    );

    const ragContext = retrieved
      .map(
        (item, index) =>
          `[RAG record ${index + 1}]\n${item.content}`
      )
      .join("\n\n");

    const medicalContext = {
      patient: {
        name: patientProfile.full_name || "Patient",
        email: patientProfile.email,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
        blood_group: patient.blood_group,
      },
      active_medications: medications || [],
      all_documented_records: records,
      retrieved_records: ragContext,
    };

    const summary = await generateWithGemini({
      systemInstruction: `
You are the Medical Records Agent for Heloraa Clinic.

Transform documented medical records into a concise, doctor-friendly
clinical summary.

Include:
1. Patient Overview
2. Relevant Documented Medical History
3. Previous Assessments or Diagnoses
4. Documented Treatments
5. Current Medications
6. Recent Vitals or Clinically Relevant Measurements
7. Explicitly Documented Changes or Trends
8. Points the Doctor May Want to Review

IMPORTANT SAFETY RULES:
- Only use information present in the supplied records.
- Never invent diagnoses, symptoms, medications, or test results.
- Do not make a new medical diagnosis.
- Do not recommend starting, stopping, or changing medication.
- Clearly distinguish documented information from points requiring review.
- Do not present assumptions as facts.
- This is a clinical summarization tool, not an autonomous medical decision-maker.
      `,
      prompt: `
Generate the clinical summary from the following structured patient data
and RAG-retrieved medical context:

${JSON.stringify(medicalContext, null, 2)}
      `,
      temperature: 0.1,
      maxOutputTokens: 1600,
    });

    const { error: saveError } = await supabase
      .from("ai_interactions")
      .insert({
        user_id: user.id,
        patient_id: patient.id,
        agent_name: "medical_records",
        input_text: "Generate clinical summary",
        output_text: summary,
        metadata: {
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
          rag: true,
          record_count: records.length,
          retrieved_record_ids: retrieved.map(
            (item) => item.record_id
          ),
        },
      });

    if (saveError) {
      console.error("AI SAVE ERROR:", saveError);
    }

    return NextResponse.json({
      summary,
      patient: {
        id: patient.id,
        name: patientProfile.full_name || "Patient",
      },
      rag: {
        enabled: true,
        sources: retrieved.map((item) => ({
          record_id: item.record_id,
          similarity: item.similarity,
        })),
      },
    });
  } catch (error) {
    console.error("Medical Records Agent error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate clinical summary",
      },
      { status: 500 }
    );
  }
}
