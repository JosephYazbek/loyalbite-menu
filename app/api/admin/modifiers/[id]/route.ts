import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { enforceRateLimit } from "@/lib/api/rate-limit";

const numberLike = z
  .union([z.number(), z.string()])
  .transform((val) => (typeof val === "number" ? val : Number(val)))
  .refine((val) => Number.isFinite(val), { message: "Invalid number" });

const modifierOptionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  price: numberLike.optional().nullable(),
});

const modifierSchema = z.object({
  name: z.string().trim().min(1),
  min_choices: z.number().int().nonnegative().optional().default(0),
  max_choices: z.number().int().positive().optional().default(1),
  options: z.array(modifierOptionSchema).default([]),
});

async function getContext(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
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
    console.error("[MODIFIERS] membership error", error);
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
  const ctx = await getContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(supabase, ctx.userId, "admin_modifiers_put");
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = modifierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("modifiers")
    .select("id, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing || existing.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("modifiers")
    .update({
      name: parsed.data.name,
      min_choices: parsed.data.min_choices,
      max_choices: parsed.data.max_choices,
    })
    .eq("id", id);

  if (updateError) {
    console.error("[MODIFIERS] update error", updateError);
    return NextResponse.json({ error: "Failed to update modifier" }, { status: 500 });
  }

  // Reset options and re-insert (simpler than diff)
  await supabase.from("modifier_options").delete().eq("modifier_id", id);

  if (parsed.data.options.length) {
    const { error: optionsError } = await supabase.from("modifier_options").insert(
      parsed.data.options.map((opt) => ({
        modifier_id: id,
        name: opt.name,
        price: opt.price ?? null,
      }))
    );
    if (optionsError) {
      console.error("[MODIFIERS] options update error", optionsError);
      return NextResponse.json({ error: "Failed to update options" }, { status: 500 });
    }
  }

  const { data: full } = await supabase
    .from("modifiers")
    .select("id, restaurant_id, name, min_choices, max_choices, modifier_options(id, name, price)")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({ modifier: full });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const ctx = await getContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(supabase, ctx.userId, "admin_modifiers_delete");
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("modifiers")
    .select("id, restaurant_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing || existing.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
  }

  const { error } = await supabase.from("modifiers").delete().eq("id", id);

  if (error) {
    console.error("[MODIFIERS] delete error", error);
    return NextResponse.json({ error: "Failed to delete modifier" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
