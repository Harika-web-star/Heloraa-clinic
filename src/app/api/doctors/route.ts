import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

    const { data: doctors, error } = await supabase
      .from("doctors")
      .select(`
        id,
        specialization,
        experience_years,
        profiles (
          full_name
        )
      `)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      doctors: doctors || [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load doctors" },
      { status: 500 }
    );
  }
}