import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

async function getRestaurantId(supabase: SupabaseServerClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: "Failed to load membership", status: 500 } as const;
  }

  if (!membership?.restaurant_id) {
    return { error: "No restaurant found", status: 400 } as const;
  }

  return { restaurantId: membership.restaurant_id as string } as const;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id: targetBranchId } = await params;

  let body: { sourceBranchId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const sourceBranchId =
    typeof body.sourceBranchId === "string" ? body.sourceBranchId : null;

  if (!sourceBranchId) {
    return NextResponse.json(
      { error: "sourceBranchId is required." },
      { status: 400 }
    );
  }

  if (sourceBranchId === targetBranchId) {
    return NextResponse.json(
      { error: "Select a different source branch." },
      { status: 400 }
    );
  }

  const membership = await getRestaurantId(supabase);
  if ("error" in membership) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status }
    );
  }
  const { restaurantId } = membership;

  const [{ data: targetBranch }, { data: sourceBranch }] = await Promise.all([
    supabase
      .from("branches")
      .select("id, restaurant_id, name")
      .eq("id", targetBranchId)
      .maybeSingle(),
    supabase
      .from("branches")
      .select("id, restaurant_id, name")
      .eq("id", sourceBranchId)
      .maybeSingle(),
  ]);

  if (!targetBranch || targetBranch.restaurant_id !== restaurantId) {
    return NextResponse.json(
      { error: "Target branch not found." },
      { status: 404 }
    );
  }

  if (!sourceBranch || sourceBranch.restaurant_id !== restaurantId) {
    return NextResponse.json(
      { error: "Source branch not found." },
      { status: 404 }
    );
  }

  await supabase
    .from("item_branch_overrides")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("branch_id", targetBranch.id);

  const { data: sourceOverrides, error: overridesError } = await supabase
    .from("item_branch_overrides")
    .select("item_id, price, secondary_price, is_available, display_order")
    .eq("restaurant_id", restaurantId)
    .eq("branch_id", sourceBranch.id);

  if (overridesError) {
    console.error("[BRANCHES][CLONE] load overrides error", overridesError);
    return NextResponse.json(
      { error: "Failed to load source branch overrides." },
      { status: 500 }
    );
  }

  if (sourceOverrides && sourceOverrides.length > 0) {
    const payload = sourceOverrides.map((row) => ({
      restaurant_id: restaurantId,
      branch_id: targetBranch.id,
      item_id: row.item_id,
      price: row.price,
      secondary_price: row.secondary_price,
      is_available: row.is_available,
      display_order: row.display_order,
    }));

    const { error: insertError } = await supabase
      .from("item_branch_overrides")
      .insert(payload);

    if (insertError) {
      console.error("[BRANCHES][CLONE] insert error", insertError);
      return NextResponse.json(
        { error: "Failed to clone branch menu." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
