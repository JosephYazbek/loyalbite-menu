import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const EVENT_TYPES = new Set(["menu_view", "category_view", "item_view"]);

type LogEventBody = {
  restaurantId?: string;
  branchId?: string;
  categoryId?: string;
  itemId?: string;
  eventType?: string;
  deviceType?: string | null;
  language?: string | null;
  sessionId?: string | null;
};

const isValidUuid = (value: string | undefined): value is string => {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  let body: LogEventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { restaurantId, branchId, categoryId, itemId, eventType, deviceType, language, sessionId } =
    body;

  if (!isValidUuid(restaurantId) || !isValidUuid(branchId) || !eventType) {
    return NextResponse.json(
      { error: "restaurantId, branchId, and eventType are required." },
      { status: 400 }
    );
  }

  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json(
      { error: "Unsupported eventType." },
      { status: 400 }
    );
  }

  const [{ data: branchRecord }, categoryResult, itemResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id, restaurant_id")
      .eq("id", branchId)
      .maybeSingle(),
    categoryId
      ? supabase
          .from("categories")
          .select("id, restaurant_id")
          .eq("id", categoryId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    itemId
      ? supabase
          .from("items")
          .select("id, restaurant_id, category_id")
          .eq("id", itemId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!branchRecord || branchRecord.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: "Invalid branch." }, { status: 400 });
  }

  if (categoryId) {
    if (
      categoryResult.error ||
      !categoryResult.data ||
      categoryResult.data.restaurant_id !== restaurantId
    ) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
  }

  if (itemId) {
    if (
      itemResult.error ||
      !itemResult.data ||
      itemResult.data.restaurant_id !== restaurantId
    ) {
      return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    }
    if (categoryId && itemResult.data.category_id !== categoryId) {
      return NextResponse.json(
        { error: "Item does not belong to category." },
        { status: 400 }
      );
    }
  }

  const insertPayload = {
    restaurant_id: restaurantId,
    branch_id: branchId,
    category_id: categoryId ?? null,
    item_id: itemId ?? null,
    event_type: eventType,
    device_type: deviceType ?? null,
    language: language ?? null,
    session_id: sessionId ?? null,
  };

  const { error: insertError } = await supabase
    .from("analytics_events")
    .insert(insertPayload);

  if (insertError) {
    console.error("[analytics] failed to insert event", insertError);
    return NextResponse.json(
      { error: "Failed to log event." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
