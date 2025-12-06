import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ensureSlug } from "@/lib/slug";
import { normalizeBranchSlugs } from "@/lib/branch-slug";

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
};

type BranchDBRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  opening_hours: unknown | null;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1) Get restaurant ID
  const { data: membershipRow } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membershipRow) {
    return NextResponse.json(
      { error: "No restaurants found for this user" },
      { status: 400 }
    );
  }

  const restaurantId = membershipRow.restaurant_id;

  // 2) Get restaurant info
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, primary_color")
    .eq("id", restaurantId)
    .single<RestaurantRecord>();

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  // 3) Get branches
  const { data: branches } = await supabase
    .from("branches")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  const normalizedBranches = await normalizeBranchSlugs(
    supabase,
    (branches ?? []) as BranchDBRecord[]
  );

  const safeBranches = normalizedBranches.map((record) => ({
    ...record,
    whatsapp: record.whatsapp_number,
  }));

  return NextResponse.json({
    restaurant,
    branches: safeBranches,
  });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name: string = (body.name ?? "").trim();
  const slugInput: string | null =
    typeof body.slug === "string" ? body.slug.trim() : null;

  const address: string | null =
    typeof body.address === "string" ? body.address.trim() : null;

  const phone: string | null =
    typeof body.phone === "string" ? body.phone.trim() : null;

  const whatsapp: string | null =
    typeof body.whatsapp === "string" ? body.whatsapp.trim() : null;

  const is_active: boolean = body.is_active ?? true;
  const opening_hours = body.opening_hours ?? null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // 1) Get restaurant ID
  const { data: membershipRow } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membershipRow) {
    return NextResponse.json(
      { error: "No restaurants found for this user" },
      { status: 400 }
    );
  }

  const restaurantId = membershipRow.restaurant_id;

  const finalSlug = ensureSlug(slugInput, name);

  // 2) Insert new branch
  const { data: inserted, error: insertError } = await supabase
    .from("branches")
    .insert({
      restaurant_id: restaurantId,
      name,
      slug: finalSlug,
      address,
      phone,
      whatsapp_number: whatsapp,
      is_active,
      opening_hours,
    })
    .select("*")
    .single<BranchDBRecord>();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  const normalized = {
    ...inserted,
    whatsapp: inserted.whatsapp_number,
  };

  return NextResponse.json(normalized, { status: 201 });
}
