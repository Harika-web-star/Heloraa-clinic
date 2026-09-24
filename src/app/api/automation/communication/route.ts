import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWithOpenRouter } from "@/lib/ai/provider";

export async function POST(request: Request) {
  try {
    const expectedToken = process.env.AUTOMATION_SECRET;
    if (!expectedToken || request.headers.get("authorization") !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();

    const body = await request.json();

    const {
      recipientUserId,
      type = "general",
      context,
      appointmentId,
    } = body;

    if (!recipientUserId) {
      return NextResponse.json(
        {
          error: "recipientUserId is required.",
        },
        { status: 400 }
      );
    }

    if (!context) {
      return NextResponse.json(
        {
          error: "context is required.",
        },
        { status: 400 }
      );
    }

    // Find recipient
    const { data: recipient, error: recipientError } =
      await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", recipientUserId)
        .single();

    if (recipientError || !recipient) {
      return NextResponse.json(
        {
          error: "Recipient profile not found.",
          details: recipientError?.message,
        },
        { status: 404 }
      );
    }

    // Generate notification using free Groq LLM
    const message = await generateWithOpenRouter({
      systemInstruction: `
You are the Communication Agent for Heloraa Clinic.

Create a short, professional healthcare notification.

Rules:
- Be concise.
- Be calm and professional.
- Do not diagnose.
- Do not provide treatment advice.
- Do not invent information.
- Use only the supplied context.
- Return ONLY the notification message.
      `,
      prompt: `
Recipient: ${recipient.full_name}
Communication type: ${type}
Context: ${context}
      `,
      temperature: 0.2,
      maxOutputTokens: 250,
    });

    if (!message) {
      return NextResponse.json(
        {
          error: "AI did not generate a message.",
        },
        { status: 500 }
      );
    }

    // Create notification
    const {
      data: notification,
      error: notificationError,
    } = await supabase
      .from("notifications")
      .insert({
        user_id: recipient.id,
        title: getNotificationTitle(type),
        message,
        type,
        read: false,
        metadata: {
          generated_by: "communication_agent",
          source: "n8n_automation",
          appointment_id: appointmentId || null,
        },
      })
      .select()
      .single();

    if (notificationError) {
      console.error(
        "NOTIFICATION INSERT ERROR:",
        notificationError
      );

      return NextResponse.json(
        {
          error: "Notification could not be created.",
          details: notificationError.message,
        },
        { status: 500 }
      );
    }

    // Log AI interaction
    const { error: interactionError } =
      await supabase
        .from("ai_interactions")
        .insert({
          user_id: recipient.id,
          patient_id: null,
          agent_name: "communication",
          input_text: JSON.stringify({
            recipientUserId,
            type,
            context,
            appointmentId,
          }),
          output_text: message,
          metadata: {
            model:
              process.env.GROQ_MODEL ||
              "openai/gpt-oss-20b",
            provider: "groq",
            rag: false,
            source: "n8n_automation",
            notification_id: notification.id,
          },
        });

    if (interactionError) {
      console.warn(
        "AI interaction logging failed:",
        interactionError.message
      );
    }

    return NextResponse.json({
      success: true,
      message,
      notification,
    });
  } catch (error) {
    console.error(
      "AUTOMATION COMMUNICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate communication.",
      },
      { status: 500 }
    );
  }
}

function getNotificationTitle(type: string) {
  switch (type) {
    case "appointment_reminder":
      return "Appointment Reminder";

    case "appointment_confirmation":
      return "Appointment Confirmed";

    case "follow_up":
      return "Follow-up Reminder";

    case "report_ready":
      return "Report Available";

    case "doctor_message":
      return "Message from Doctor";

    default:
      return "Heloraa Clinic";
  }
}
