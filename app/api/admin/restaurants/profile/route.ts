import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService";

const LANGUAGE_VALUES = new Set(["en", "ar", "both"]);

const HEX_PATTERN = /^#([\da-f]{3}|[\da-f]{6})$/i;

type RestaurantUpdate = {
  description_en?: string | null;
  description_ar?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  website?: string | null;
  primary_color?: string | null;
  default_language?: "en" | "ar" | "both";
  logo_url?: string | null;
  cover_image_url?: string | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const { data: membership } = await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const restaurantId = membership?.restaurant_id;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant not found for this user" },
        { status: 400 }
      );
    }

    const updates: RestaurantUpdate = {};

    const normalizeText = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;

    if ("description_en" in body) {
      updates.description_en = normalizeText(body.description_en);
    }

    if ("description_ar" in body) {
      updates.description_ar = normalizeText(body.description_ar);
    }

    if ("phone" in body) {
      updates.phone = normalizeText(body.phone);
    }

    if ("whatsapp_phone" in body) {
      updates.whatsapp_phone = normalizeText(body.whatsapp_phone);
    }

    if ("email" in body) {
      updates.email = normalizeText(body.email);
    }

    if ("website" in body) {
      updates.website = normalizeText(body.website);
    }

    if ("primary_color" in body) {
      const proposed = normalizeText(body.primary_color);
      updates.primary_color =
        proposed && HEX_PATTERN.test(proposed) ? proposed : null;
    }

    if ("default_language" in body) {
      const lang =
        typeof body.default_language === "string"
          ? body.default_language
          : null;
      updates.default_language = (lang && LANGUAGE_VALUES.has(lang)
        ? (lang as "en" | "ar" | "both")
        : "en");
    }

    if ("logo_url" in body) {
      updates.logo_url = normalizeText(body.logo_url);
    }

    if ("cover_image_url" in body) {
      updates.cover_image_url = normalizeText(body.cover_image_url);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const serviceSupabase = createSupabaseServiceRoleClient();

    const { data, error: updateError } = await serviceSupabase
      .from("restaurants")
      .update(updates)
      .eq("id", restaurantId)
      .select(
        `
        id,
        name,
        slug,
        description_en,
        description_ar,
        phone,
        whatsapp_phone,
        email,
        website,
        primary_color,
        default_language,
        logo_url,
        cover_image_url
      `
      )
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json(
        { error: updateError?.message ?? "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ restaurant: data });
  } catch (error) {
    console.error("[ADMIN][restaurant profile]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
