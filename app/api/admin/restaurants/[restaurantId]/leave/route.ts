import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface RouteContext {
  params: Promise<{ restaurantId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { restaurantId } = await context.params;

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant id is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("id, role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  }

  if (membership.role === "owner") {
    return NextResponse.json(
      { error: "Owners must transfer or delete the restaurant instead of leaving." },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { error: deleteError } = await supabaseAdmin
    .from("restaurant_users")
    .delete()
    .eq("id", membership.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
