import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

//
// PUT — update an item
//
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✔ unwrap params
    const body = await req.json();

    const supabase = await createSupabaseServerClient();

    const { data: item, error } = await supabase
      .from("items")
      .update(body)
      .eq("id", id) // ✔ use unwrapped id
      .select("*")
      .single();

    if (error) {
      console.error("Update item error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ item });
  } catch (err: any) {
    console.error("API PUT /items error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

//
// DELETE — delete an item
//
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✔ unwrap params

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id); // ✔ use unwrapped id

    if (error) {
      console.error("Delete item error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE /items error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
