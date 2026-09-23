import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

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