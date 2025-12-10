import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface RouteContext {
  params: Promise<{ restaurantId: string; memberId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const { restaurantId, memberId } = await context.params;

  if (!restaurantId || !memberId) {
    return NextResponse.json({ error: "Missing identifiers." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: target, error: targetError } = await supabaseAdmin
    .from("restaurant_users")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (target.role === "owner" || target.user_id === user.id) {
    return NextResponse.json(
      { error: "Owners cannot be removed this way." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("restaurant_users")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
