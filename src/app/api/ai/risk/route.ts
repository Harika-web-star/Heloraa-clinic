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
        { status: 403 }
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
        blood_group,
        assigned_doctor_id
      `)
      .eq("id", patientId)
      .eq("assigned_doctor_id", doctor.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: "Patient not found or not assigned to you" },
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

    const { data: medications, error: medicationError } =
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

    if (medicationError) {
      return NextResponse.json(
        { error: medicationError.message },
        { status: 500 }
      );
    }

    await syncMedicalRecordEmbeddings(
      supabase,
      patient.id,
      records || []
    );

    const retrieved = await retrieveMedicalContext(
      supabase,
      patient.id,
      "Identify documented abnormal measurements, repeated issues, medication-related information, changes over time, and follow-up items that may deserve doctor review.",
      8
    );

    const retrievedContext = retrieved
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
      records: records || [],
      medications: medications || [],
      rag_retrieved_records: retrievedContext,
    };

    const aiOutput = await generateWithGemini({
      systemInstruction: `
You are the Risk Monitoring Agent for Heloraa Clinic.

Review documented patient information and identify items that may deserve
additional review by the assigned doctor.

IMPORTANT SAFETY RULES:
- Only use information explicitly present in the supplied data.
- Do not invent symptoms, diagnoses, test results, or medical history.
- Do not diagnose the patient.
- Do not prescribe or recommend medication changes.
- Do not claim that a disease definitely exists.
- Do not make assumptions from missing information.
- Your output is a clinical review aid, not a medical decision.
- If there is insufficient information for a meaningful flag, return NO_FLAG.

Look for:
1. Clearly documented abnormal or concerning measurements.
2. Significant changes between documented records.
3. Repeated issues explicitly present in the records.
4. Medication-related information that should be reviewed.
5. Missing or outdated follow-up information when explicitly apparent.
6. Other documented information that reasonably warrants doctor review.

Return ONLY valid JSON.

If a review item exists:
{
  "priority": "low",
  "title": "Short title",
  "description": "Concise explanation based only on documented data"
}

Priority must be exactly: "low", "normal", "high", or "critical".

If no meaningful review item exists:
{
  "status": "NO_FLAG"
}
      `,
      prompt: `
Review the following patient data and RAG-retrieved records:

${JSON.stringify(medicalContext, null, 2)}
      `,
      json: true,
      temperature: 0.1,
      maxOutputTokens: 700,
    });

    const cleanedOutput = aiOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let assessment: {
      status?: string;
      priority?: string;
      title?: string;
      description?: string;
    };

    try {
      assessment = JSON.parse(cleanedOutput);
    } catch (parseError) {
      console.error("AI JSON PARSE ERROR:", parseError);
      return NextResponse.json(
        {
          error: "AI returned an invalid risk assessment.",
        },
        { status: 500 }
      );
    }

    const { error: interactionError } = await supabase
      .from("ai_interactions")
      .insert({
        user_id: user.id,
        patient_id: patient.id,
        agent_name: "risk_monitoring",
        input_text: JSON.stringify(medicalContext),
        output_text: cleanedOutput,
        metadata: {
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
          rag: true,
          retrieved_record_ids: retrieved.map(
            (item) => item.record_id
          ),
        },
      });

    if (interactionError) {
      console.error(
        "AI INTERACTION SAVE ERROR:",
        interactionError
      );
    }

    if (assessment.status === "NO_FLAG") {
      return NextResponse.json({
        flag: null,
        message: "No review flag identified.",
        rag: {
          enabled: true,
          sources: retrieved.map((item) => ({
            record_id: item.record_id,
            similarity: item.similarity,
          })),
        },
      });
    }

    if (!assessment.title || !assessment.description) {
      return NextResponse.json(
        { error: "AI returned incomplete review flag information." },
        { status: 500 }
      );
    }

    const { data: savedFlag, error: flagError } =
      await supabase
        .from("ai_flags")
        .insert({
          patient_id: patient.id,
          agent_name: "risk_monitoring",
          priority: assessment.priority || "normal",
          title: assessment.title,
          description: assessment.description,
          status: "open",
        })
        .select()
        .single();

    if (flagError) {
      return NextResponse.json(
        {
          error:
            "Risk analysis completed, but the AI review flag could not be saved.",
          details: flagError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      flag: savedFlag,
      message: "AI review flag created successfully.",
      rag: {
        enabled: true,
        sources: retrieved.map((item) => ({
          record_id: item.record_id,
          similarity: item.similarity,
        })),
      },
    });
  } catch (error) {
    console.error("Risk Monitoring Agent Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run Risk Monitoring Agent.",
      },
      { status: 500 }
    );
  }
}
