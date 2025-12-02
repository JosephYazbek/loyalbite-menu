import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await createSupabaseServerClient();

    // Insert new item
    const { data: item, error } = await supabase
      .from("items")
      .insert(body)
      .select("*")
      .single();

    if (error) {
      console.error("Create item error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (err: any) {
    console.error("API POST /items error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
