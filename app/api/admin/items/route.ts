import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { enforceRateLimit } from "@/lib/api/rate-limit";

const numberLike = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === "number" ? val : Number(val)))
  .refine((val) => Number.isFinite(val), { message: "Invalid number" });

const itemSchema = z.object({
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

async function getRestaurantId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
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

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const context = await getRestaurantId(supabase);
  if ("error" in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const rate = await enforceRateLimit(supabase, context.userId, "admin_items_post");
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = {
    ...parsed.data,
    restaurant_id: context.restaurantId,
  };

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", payload.category_id)
    .eq("restaurant_id", context.restaurantId)
    .maybeSingle();

  if (categoryError || !category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data: item, error } = await supabase.from("items").insert(payload).select("*").single();

  if (error) {
    console.error("Create item error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
