import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface RouteContext {
  params: Promise<{ restaurantId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const { restaurantId } = await context.params;

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant id is required." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const confirmation =
    typeof body.confirmation === "string" ? body.confirmation.trim().toLowerCase() : "";

  if (confirmation !== "confirm delete") {
    return NextResponse.json(
      { error: 'You must type "confirm delete" to remove a restaurant.' },
      { status: 400 }
    );
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
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  if (membership?.role !== "owner") {
    return NextResponse.json(
      { error: "Only restaurant owners can delete restaurants." },
      { status: 403 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const { data: branchRows, error: branchError } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 400 });
  }

  const branchIds = (branchRows ?? []).map((record) => record.id).filter(Boolean);

  if (branchIds.length > 0) {
    const { error: overridesError } = await supabaseAdmin
      .from("item_branch_overrides")
      .delete()
      .in("branch_id", branchIds);

    if (overridesError) {
      return NextResponse.json({ error: overridesError.message }, { status: 400 });
    }
  }

  const deletionOrder: Array<{ table: string; column: string }> = [
    { table: "items", column: "restaurant_id" },
    { table: "categories", column: "restaurant_id" },
    { table: "branches", column: "restaurant_id" },
    { table: "restaurant_invites", column: "restaurant_id" },
    { table: "analytics_events", column: "restaurant_id" },
    { table: "restaurant_users", column: "restaurant_id" },
  ];

  for (const step of deletionOrder) {
    const { error } = await supabaseAdmin.from(step.table).delete().eq(step.column, restaurantId);
    if (error) {
      return NextResponse.json(
        { error: `Failed to clean up ${step.table}: ${error.message}` },
        { status: 400 }
      );
    }
  }

  const { error: restaurantDeleteError } = await supabaseAdmin
    .from("restaurants")
    .delete()
    .eq("id", restaurantId);

  if (restaurantDeleteError) {
    return NextResponse.json({ error: restaurantDeleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
