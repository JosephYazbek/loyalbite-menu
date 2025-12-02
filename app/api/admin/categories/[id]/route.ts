import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type CategoryUpdatePayload = {
  name_en?: string;
  name_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  is_visible?: boolean;
  is_offers?: boolean;
  image_url?: string | null;
  display_order?: number;
};

async function getCurrentRestaurantId() {
  const supabase = await createSupabaseServerClient();

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
    return {
      error: "Failed to load membership",
      status: 500,
    } as const;
  }

  if (!membership?.restaurant_id) {
    return {
      error: "No restaurant found",
      status: 400,
    } as const;
  }

  return { restaurantId: membership.restaurant_id as string } as const;
}

/* -------------------------------------------------------------------- */
/* PUT /api/admin/categories/[id] */
/* -------------------------------------------------------------------- */

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // FIXED HERE

  if (!id) {
    return NextResponse.json(
      { error: "Category ID is required" },
      { status: 400 }
    );
  }

  const result = await getCurrentRestaurantId();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { restaurantId } = result;
  const supabase = await createSupabaseServerClient();

  let body: CategoryUpdatePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: CategoryUpdatePayload = {};

  if (typeof body.name_en === "string") updates.name_en = body.name_en.trim();
  if (body.name_ar !== undefined)
    updates.name_ar = body.name_ar?.trim() || null;
  if (body.description_en !== undefined)
    updates.description_en = body.description_en?.trim() || null;
  if (body.description_ar !== undefined)
    updates.description_ar = body.description_ar?.trim() || null;
  if (typeof body.is_visible === "boolean")
    updates.is_visible = body.is_visible;
  if (typeof body.is_offers === "boolean")
    updates.is_offers = body.is_offers;
  if (body.image_url !== undefined)
    updates.image_url = body.image_url?.trim() || null;
  if (typeof body.display_order === "number")
    updates.display_order = body.display_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("*")
    .single();

  if (error) {
    console.error("CAT UPDATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }

  return NextResponse.json({ category: data });
}

/* -------------------------------------------------------------------- */
/* DELETE /api/admin/categories/[id] */
/* -------------------------------------------------------------------- */

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // FIXED HERE

  const result = await getCurrentRestaurantId();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { restaurantId } = result;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
