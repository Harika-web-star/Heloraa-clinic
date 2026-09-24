import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithOpenRouter } from "@/lib/ai/provider";
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
    } =
      await supabase.auth.getUser();

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
    // 2. Request
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
    // 3. Doctor
    // --------------------------------------------------

    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select(
        "id, profile_id"
      )
      .eq(
        "profile_id",
        user.id
      )
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
    // 4. Patient
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
      .eq(
        "id",
        patientId
      )
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
    } =
      await supabase
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
    // 8. Risk analysis context
    // --------------------------------------------------
    // Risk Analysis does not run the local Hugging Face
    // embedding model in production. Vercel does not provide
    // the onnxruntime-node runtime required by that model.
    // The Risk Monitoring Agent uses the documented records
    // and active medications directly.

    let ragContext: Awaited<ReturnType<typeof retrieveMedicalContext>> = [];
    let ragAvailable = false;
    try {
      await syncMedicalRecordEmbeddings(supabase, patient.id, records || []);
      ragContext = await retrieveMedicalContext(supabase, patient.id, "Documented abnormal measurements, significant changes, repeated issues, medication review concerns, and follow-up", 5);
      ragAvailable = true;
    } catch (ragError) {
      console.error("Risk monitoring retrieval unavailable", ragError instanceof Error ? ragError.message : "unknown error");
    }

    // --------------------------------------------------
    // 9. Risk context
    // --------------------------------------------------

    const riskContext = {
      patient: {
        name:
          patientName,
        gender:
          patient.gender,
        blood_group:
          patient.blood_group,
        date_of_birth:
          patient.date_of_birth,
      },

      records:
        records || [],

      medications:
        medications || [],

      rag_context:
        ragContext,
    };

    // --------------------------------------------------
    // 10. Risk Monitoring Agent
    // --------------------------------------------------

    const prompt = `
You are the Risk Monitoring Agent for Heloraa Clinic.

Review the documented patient information and identify
items that may require additional review by the assigned doctor.

PATIENT:
${JSON.stringify(
  riskContext.patient,
  null,
  2
)}

MEDICAL RECORDS:
${JSON.stringify(
  riskContext.records,
  null,
  2
)}

ACTIVE MEDICATIONS:
${JSON.stringify(
  riskContext.medications,
  null,
  2
)}

ADDITIONAL RETRIEVED CONTEXT:
${JSON.stringify(
  riskContext.rag_context,
  null,
  2
)}

Look for:

1. Clearly documented abnormal measurements.
2. Significant documented changes.
3. Repeated documented issues.
4. Medication-related information requiring review.
5. Documented follow-up concerns.
6. Other documented information that reasonably warrants doctor attention.

IMPORTANT SAFETY RULES:

- Only use information explicitly present.
- Do not invent symptoms.
- Do not invent diagnoses.
- Do not invent test results.
- Do not diagnose the patient.
- Do not recommend medication changes.
- Do not assume missing information.
- This is a clinical review aid.
- If there is insufficient information, return NO_FLAG.

Return ONLY valid JSON:

{
  "flag": true,
  "severity": "low",
  "message": "Documented information requiring doctor review."
}

OR:

{
  "flag": false,
  "severity": "none",
  "message": "No documented risk flag identified."
}
`;

    // --------------------------------------------------
    // 11. AI analysis
    // --------------------------------------------------

    let result: string;

    try {
      result =
        await generateWithOpenRouter({
          systemInstruction:
            "You are the Risk Monitoring Agent for Heloraa Clinic. Analyze documented information only.",

          prompt,

          json: true,

          temperature: 0.1,

          maxOutputTokens: 600,
        });
    } catch (aiError) {
      console.error(
        "RISK AI ERROR:",
        aiError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Risk analysis is temporarily unavailable.",
          flag: false,
          severity: "none",
          message:
            "Risk analysis is temporarily unavailable. Please try again.",
          rag_used:
            ragAvailable,
        },
        { status: 503 }
      );
    }

    // --------------------------------------------------
    // 12. Parse safely
    // --------------------------------------------------

    let analysis: {
      flag: boolean;
      severity: string;
      message: string;
    };

    try {
      let cleaned =
        result
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();

      // Handle models that return
      // extra text around the JSON.
      const firstBrace =
        cleaned.indexOf("{");

      const lastBrace =
        cleaned.lastIndexOf("}");

      if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        lastBrace > firstBrace
      ) {
        cleaned =
          cleaned.slice(
            firstBrace,
            lastBrace + 1
          );
      }

      analysis =
        JSON.parse(cleaned);

      if (
        typeof analysis.flag !==
        "boolean"
      ) {
        throw new Error(
          "Invalid risk flag"
        );
      }

      if (
        typeof analysis.message !==
        "string"
      ) {
        throw new Error(
          "Invalid risk message"
        );
      }

      if (!["none", "low", "medium", "high"].includes(analysis.severity)) {
        throw new Error("Invalid risk severity");
      }
      if ((analysis.flag && analysis.severity === "none") || (!analysis.flag && analysis.severity !== "none")) {
        throw new Error("Inconsistent risk response");
      }
    } catch (parseError) {
      console.error(
        "RISK JSON PARSE ERROR:",
        parseError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Risk analysis returned an invalid response.",
          flag: false,
          severity: "none",
          message:
            "Risk analysis could not be interpreted automatically. Please review the documented records.",
        },
        { status: 502 }
      );
    }

    // --------------------------------------------------
    // 13. Log AI interaction
    // --------------------------------------------------

    try {
      await supabase
        .from("ai_interactions")
        .insert({
          user_id: user.id,

          patient_id:
            patient.id,

          agent_type:
            "risk_monitoring",

          input_context:
            riskContext,

          output:
            analysis,
        });
    } catch (logError) {
      console.error(
        "RISK LOG ERROR:",
        logError
      );
    }

    // --------------------------------------------------
    // 14. Save AI flag
    // --------------------------------------------------

    if (analysis.flag) {
      try {
        await supabase
          .from("ai_flags")
          .insert({
            patient_id:
              patient.id,

            doctor_id:
              doctor.id,

            severity:
              analysis.severity ||
              "low",

            message:
              analysis.message,

            status:
              "open",
          });
      } catch (flagError) {
        console.error(
          "AI FLAG SAVE ERROR:",
          flagError
        );
      }
    }

    // --------------------------------------------------
    // 15. Return
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      flag:
        analysis.flag,

      severity:
        analysis.severity,

      message:
        analysis.message,

      analysis,

      rag_used: ragAvailable && ragContext.length > 0,

      rag_sources:
        ragContext,
    });
  } catch (error) {
    console.error(
      "RISK MONITORING AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        flag: false,
        severity: "none",
        message:
          "Risk analysis could not be completed. Please review the patient's documented records.",
        error: "Risk analysis could not be completed.",
      },
      { status: 500 }
    );
  }
}
