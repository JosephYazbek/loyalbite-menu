// app/api/admin/categories/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type CategoryInsertPayload = {
  name_en: string;
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
    return { error: "Unauthorized", status: 401 as const } as const;
  }

  // Simple lookup: no join, no alias, no parser issues
  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("[CATEGORIES] membershipError", membershipError);
    return {
      error: "Failed to load restaurant membership",
      status: 500 as const,
    } as const;
  }

  if (!membership?.restaurant_id) {
    return {
      error: "No restaurant found for this user",
      status: 400 as const,
    } as const;
  }

  return { restaurantId: membership.restaurant_id as string } as const;
}

// GET /api/admin/categories
export async function GET() {
  const result = await getCurrentRestaurantId();

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { restaurantId } = result;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[CATEGORIES] GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }

  return NextResponse.json({ categories: data ?? [] });
}

// POST /api/admin/categories
export async function POST(req: Request) {
  const result = await getCurrentRestaurantId();

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const { restaurantId } = result;
  const supabase = await createSupabaseServerClient();

  let body: CategoryInsertPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (!body.name_en || typeof body.name_en !== "string") {
    return NextResponse.json(
      { error: "name_en is required" },
      { status: 400 }
    );
  }

  const payload: CategoryInsertPayload & { restaurant_id: string } = {
    restaurant_id: restaurantId,
    name_en: body.name_en.trim(),
    name_ar: body.name_ar?.trim() || null,
    description_en: body.description_en?.trim() || null,
    description_ar: body.description_ar?.trim() || null,
    is_visible: body.is_visible ?? true,
    is_offers: body.is_offers ?? false,
    image_url: body.image_url?.trim() || null,
    display_order:
      typeof body.display_order === "number" ? body.display_order : 0,
  };

  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[CATEGORIES] POST error", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }

  return NextResponse.json({ category: data }, { status: 201 });
}
