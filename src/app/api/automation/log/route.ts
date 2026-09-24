import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      workflowName,
      triggerType,
      status,
      referenceId,
      details,
    } = body;

    if (!workflowName) {
      return NextResponse.json(
        {
          error: "workflowName is required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("automation_logs")
      .insert({
        workflow_name: workflowName,
        trigger_type: triggerType || "n8n",
        status: status || "success",
        reference_id: referenceId || null,
        details: details || {},
      })
      .select()
      .single();

    if (error) {
      console.error(
        "AUTOMATION LOG INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to save automation log.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Automation log saved successfully.",
      log: data,
    });
  } catch (error) {
    console.error(
      "AUTOMATION LOG API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save automation log.",
      },
      { status: 500 }
    );
  }
}
