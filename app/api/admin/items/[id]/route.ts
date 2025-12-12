import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { enforceRateLimit } from "@/lib/api/rate-limit";

const numberLike = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === "number" ? val : Number(val)))
  .refine((val) => Number.isFinite(val), { message: "Invalid number" });

const itemUpdateSchema = z.object({
  category_id: z.string().uuid(),
  name_en: z.string().trim().min(1),
  name_ar: z.string().trim().optional().nullable(),
  description_en: z.string().trim().optional().nullable(),
  description_ar: z.string().trim().optional().nullable(),
  price: numberLike,
  secondary_price: numberLike.optional().nullable(),
  primary_currency: z.string().trim().min(1).default("USD"),
  secondary_currency: z.string().trim().optional().nullable(),
  calories: numberLike.optional().nullable(),
  image_url: z.string().trim().optional().nullable(),
  is_new: z.boolean().optional().default(false),
  is_popular: z.boolean().optional().default(false),
  is_spicy: z.boolean().optional().default(false),
  is_vegetarian: z.boolean().optional().default(false),
  is_vegan: z.boolean().optional().default(false),
  is_gluten_free: z.boolean().optional().default(false),
  contains_dairy: z.boolean().optional().default(false),
  contains_nuts: z.boolean().optional().default(false),
  contains_eggs: z.boolean().optional().default(false),
  contains_shellfish: z.boolean().optional().default(false),
  contains_soy: z.boolean().optional().default(false),
  contains_sesame: z.boolean().optional().default(false),
  is_visible: z.boolean().optional().default(true),
  is_available: z.boolean().optional().default(true),
  item_code: z.string().trim().optional().nullable(),
  display_order: numberLike.optional().nullable(),
  diet_category: z.string().trim().optional().nullable(),
  is_featured: z.boolean().optional().default(false),
  recommendation_score: numberLike.optional().nullable(),
});

async function getRestaurantContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: membership, error } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[ITEMS] membership error", error);
    return { error: "Failed to load membership", status: 500 as const };
  }
  if (!membership?.restaurant_id) {
    return { error: "No restaurant for this user", status: 400 as const };
  }

  return { restaurantId: membership.restaurant_id as string, userId: user.id };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const ctx = await getRestaurantContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(supabase, ctx.userId, "admin_items_put");
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = itemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("items")
    .select("id, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing || existing.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.category_id)
    .eq("restaurant_id", ctx.restaurantId)
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from("items")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const ctx = await getRestaurantContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(supabase, ctx.userId, "admin_items_delete");
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("items")
    .select("id, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing || existing.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) {
    console.error("Delete item error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
