import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithOpenRouter } from "@/lib/ai/provider";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      recipientId,
      title,
      context,
      type = "general",
    } = body;

    if (!recipientId) {
      return NextResponse.json(
        { error: "recipientId is required." },
        { status: 400 }
      );
    }

    /*
     * Get sender profile
     */
    const { data: senderProfile, error: senderError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

    if (senderError) {
      console.error("SENDER PROFILE ERROR:", senderError);

      return NextResponse.json(
        {
          error: "Unable to load sender profile.",
          details: senderError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Get recipient profile
     */
    const { data: recipientProfile, error: recipientError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", recipientId)
        .single();

    if (recipientError || !recipientProfile) {
      return NextResponse.json(
        { error: "Recipient not found." },
        { status: 404 }
      );
    }

    /*
     * Generate concise healthcare communication
     */
    const prompt = `
Create a concise, professional healthcare notification.

Sender:
${senderProfile.full_name}

Sender role:
${senderProfile.role}

Recipient:
${recipientProfile.full_name}

Recipient role:
${recipientProfile.role}

Notification title:
${title || "Healthcare Notification"}

Notification type:
${type}

Context:
${context || "No additional context provided."}

Requirements:
- Be clear and professional.
- Keep it concise.
- Do not invent medical facts.
- Do not provide a diagnosis.
- Do not use unnecessary technical language.
- Return only the notification message.
`;

    const generatedMessage = await generateWithOpenRouter({
      systemInstruction:
        "You are the Communication Agent for Heloraa Clinic. Generate safe, concise healthcare communications.",
      prompt,
      temperature: 0.2,
      maxOutputTokens: 300,
    });

    /*
     * Save notification
     */
    const { data: notification, error: notificationError } =
      await supabase
        .from("notifications")
        .insert({
          user_id: recipientId,
          title: title || "Healthcare Notification",
          message: generatedMessage,
          type,
          read: false,
          metadata: {
            generated_by: "communication_agent",
            sender_id: user.id,
            sender_role: senderProfile.role,
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
          error: "Failed to create notification.",
          details: notificationError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Log AI interaction
     */
    const { error: interactionError } =
      await supabase.from("ai_interactions").insert({
        user_id: user.id,
        agent_name: "communication_agent",
        input_text: context || "",
        output_text: generatedMessage,
        metadata: {
          recipient_id: recipientId,
          notification_id: notification.id,
          type,
        },
      });

    if (interactionError) {
      console.error(
        "AI INTERACTION LOG ERROR:",
        interactionError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Communication generated successfully.",
      notification,
    });
  } catch (error) {
    console.error(
      "COMMUNICATION AGENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Communication Agent failed.",
      },
      { status: 500 }
    );
  }
}