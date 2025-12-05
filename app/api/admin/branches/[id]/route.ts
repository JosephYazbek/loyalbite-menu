import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ensureSlug } from "@/lib/slug";

/**
 * DELETE /api/admin/branches/:id
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("branches")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PUT /api/admin/branches/:id
 */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "Invalid branch id" }, { status: 400 });
  }

  const body = await req.json();
  const safeSlug = ensureSlug(body.slug, body.name || "");

  const payload = {
    name: body.name,
    slug: safeSlug,
    address: body.address,
    phone: body.phone,
    whatsapp_number: body.whatsapp,
    is_active: body.is_active,
    opening_hours: body.opening_hours,
  };

  const { data, error } = await supabase
    .from("branches")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
