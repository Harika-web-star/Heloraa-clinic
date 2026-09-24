import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const expectedToken = process.env.AUTOMATION_SECRET;
    if (!expectedToken || request.headers.get("authorization") !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "Supabase server configuration is missing.",
          details:
            "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    // Service-role client for server-side automation.
    // This does not require a logged-in browser user.
    const supabase = createAdminClient();

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    console.log(
      "AUTOMATION: Fetching appointments for:",
      tomorrowDate
    );

    const {
      data: appointments,
      error,
    } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        appointment_time,
        appointment_type,
        reason,
        status,
        patient_id,
        doctor_id,
        patients (
          id,
          profile_id,
          profiles (
            full_name,
            email
          )
        ),
        doctors (
          id,
          profile_id,
          specialization,
          profiles (
            full_name,
            email
          )
        )
      `)
      .eq("appointment_date", tomorrowDate)
      .neq("status", "cancelled")
      .order("appointment_time", {
        ascending: true,
      });

    if (error) {
      console.error(
        "AUTOMATION APPOINTMENTS ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to fetch tomorrow's appointments.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      date: tomorrowDate,
      count: appointments?.length || 0,
      appointments: appointments || [],
    });
  } catch (error) {
    console.error(
      "AUTOMATION APPOINTMENTS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch appointments.",
      },
      { status: 500 }
    );
  }
}
