import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateWithOpenRouter,
} from "@/lib/ai/provider";
import { retrieveMedicalContext, syncMedicalRecordEmbeddings } from "@/lib/ai/rag";

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    // --------------------------------------------------
    // 1. Authenticate
    // --------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Read request
    // --------------------------------------------------

    const body: unknown = await request.json();
    const patientId = body && typeof body === "object" ? (body as { patientId?: unknown }).patientId : undefined;

    if (typeof patientId !== "string" || !patientId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "patientId is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. Verify doctor
    // --------------------------------------------------

    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .single();

    if (
      doctorError ||
      !doctor
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Doctor profile not found",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 4. Get patient
    // --------------------------------------------------

    const {
      data: patient,
      error: patientError,
    } = await supabase
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
      .eq(
        "assigned_doctor_id",
        doctor.id
      )
      .single();

    if (
      patientError ||
      !patient
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Patient not found or not assigned to this doctor",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 5. Patient profile
    // --------------------------------------------------

    const {
      data: patientProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, email"
      )
      .eq(
        "id",
        patient.profile_id
      )
      .single();

    if (
      profileError ||
      !patientProfile
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Patient profile could not be loaded",
        },
        { status: 500 }
      );
    }

    const patientName =
      patientProfile.full_name ||
      "Patient";

    // --------------------------------------------------
    // 6. Medical records
    // --------------------------------------------------

    const {
      data: records,
      error: recordsError,
    } = await supabase
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
      .eq(
        "patient_id",
        patient.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (recordsError) {
      console.error(
        "RECORDS ERROR:",
        recordsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            recordsError.message,
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 7. Active medications
    // --------------------------------------------------

    const {
      data: medications,
      error: medicationError,
    } = await supabase
      .from("medications")
      .select(`
        medication_name,
        dosage,
        frequency,
        instructions,
        active
      `)
      .eq(
        "patient_id",
        patient.id
      )
      .eq(
        "active",
        true
      );

    if (medicationError) {
      console.error(
        "MEDICATION ERROR:",
        medicationError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            medicationError.message,
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 8. OPTIONAL RAG
    //
    // RAG is deliberately isolated.
    // If embeddings/ONNX fail, the agent continues.
    // --------------------------------------------------

    let ragContext: Awaited<ReturnType<typeof retrieveMedicalContext>> = [];
    let ragAvailable = false;

    try {
      await syncMedicalRecordEmbeddings(supabase, patient.id, records || []);
      ragContext = await retrieveMedicalContext(supabase, patient.id, "Clinical summary chronology, documented diagnoses, treatments, and relevant vitals", 5);
      ragAvailable = true;
    } catch (ragError) {
      console.error(
        "RAG UNAVAILABLE — CONTINUING WITHOUT RAG:",
        ragError
      );

      ragContext = [];
    }

    // --------------------------------------------------
    // 9. Complete medical context
    // --------------------------------------------------

    const medicalContext = {
      patient: {
        name: patientName,
        email:
          patientProfile.email,
        date_of_birth:
          patient.date_of_birth,
        gender:
          patient.gender,
        blood_group:
          patient.blood_group,
      },

      records:
        records || [],

      medications:
        medications || [],

      rag_context:
        ragContext,
    };

    // --------------------------------------------------
    // 10. Medical Records Agent
    // --------------------------------------------------

    const prompt = `
You are the Medical Records Agent for Heloraa Clinic.

Create a concise clinical summary from the documented
patient information below.

PATIENT:
${JSON.stringify(
  medicalContext.patient,
  null,
  2
)}

MEDICAL RECORDS:
${JSON.stringify(
  medicalContext.records,
  null,
  2
)}

ACTIVE MEDICATIONS:
${JSON.stringify(
  medicalContext.medications,
  null,
  2
)}

ADDITIONAL RETRIEVED CONTEXT:
${JSON.stringify(
  medicalContext.rag_context,
  null,
  2
)}

RULES:

- Use only information explicitly documented.
- Do not invent symptoms.
- Do not invent diagnoses.
- Do not invent medications.
- Do not invent laboratory results.
- Do not make assumptions about missing information.
- Clearly summarize documented diagnoses, treatments,
  vitals and medications when available.
- Keep the summary concise and useful for doctor review.
- This is a clinical review aid, not a diagnosis.

Write a professional clinical summary.
`;

    let summary: string;

    try {
      summary =
        await generateWithOpenRouter({
          systemInstruction:
            "You are the Medical Records Agent for Heloraa Clinic. Produce accurate summaries from documented medical information only.",

          prompt,

          temperature: 0.2,

          maxOutputTokens: 1000,
        });
    } catch (aiError) {
      console.error(
        "AI SUMMARY ERROR:",
        aiError
      );

      summary =
        "Clinical summary could not be generated automatically at this moment. Please review the documented medical records and active medications.";
    }

    // --------------------------------------------------
    // 11. Log AI interaction
    // --------------------------------------------------

    try {
      await supabase
        .from("ai_interactions")
        .insert({
          user_id: user.id,
          patient_id:
            patient.id,
          agent_type:
            "medical_records",
          input_context:
            medicalContext,
          output:
            summary,
        });
    } catch (logError) {
      console.error(
        "AI LOG ERROR:",
        logError
      );
    }

    // --------------------------------------------------
    // 12. Return
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      summary,

      rag_used: ragAvailable && ragContext.length > 0,

      rag_sources:
        ragContext,
    });
  } catch (error) {
    console.error(
      "MEDICAL RECORDS AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Medical Records Agent failed",

        summary:
          "Clinical summary could not be generated automatically. Please review the documented medical records.",
      },
      { status: 500 }
    );
  }
}
