import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type OverridePayload = {
  itemId?: string;
  price?: number | null;
  secondaryPrice?: number | null;
  displayOrder?: number | null;
  isAvailable?: boolean | null;
};

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branchId = params.id;
    if (!branchId) {
      return NextResponse.json(
        { error: "Missing branchId" },
        { status: 400 }
      );
    }

    const { data: membership } = await supabase
      .from("restaurant_users")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const restaurantId = membership?.restaurant_id;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Restaurant not found for user" },
        { status: 400 }
      );
    }

    const { data: branch } = await supabase
      .from("branches")
      .select("id, restaurant_id")
      .eq("id", branchId)
      .maybeSingle();

    if (!branch || branch.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    const items = Array.isArray(body?.items)
      ? (body.items as OverridePayload[])
      : [];

    if (!items.length) {
      await supabase
        .from("item_branch_overrides")
        .delete()
        .eq("branch_id", branchId);
      return NextResponse.json({ success: true });
    }

    const itemIds = Array.from(
      new Set(items.map((entry) => entry.itemId).filter(Boolean))
    );

    if (itemIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { data: itemRecords, error: itemsError } = await supabase
      .from("items")
      .select("id, restaurant_id")
      .in("id", itemIds);

    if (itemsError) {
      return NextResponse.json(
        { error: "Failed to validate items" },
        { status: 500 }
      );
    }

    const validItemIds = new Set(
      (itemRecords ?? [])
        .filter((record) => record.restaurant_id === restaurantId)
        .map((record) => record.id)
    );

    const upsertPayload: Array<{
      restaurant_id: string;
      branch_id: string;
      item_id: string;
      price: number | null;
      secondary_price: number | null;
      is_available: boolean | null;
      display_order: number | null;
    }> = [];
    const deleteIds: string[] = [];

    items.forEach((entry) => {
      if (!entry.itemId || !validItemIds.has(entry.itemId)) {
        return;
      }
      const price = normalizeNumber(entry.price);
      const secondaryPrice = normalizeNumber(entry.secondaryPrice);
      const displayOrder = normalizeNumber(entry.displayOrder);
      const isAvailable =
        entry.isAvailable === true
          ? true
          : entry.isAvailable === false
          ? false
          : null;

      const hasOverride =
        price !== null ||
        secondaryPrice !== null ||
        displayOrder !== null ||
        isAvailable !== null;

      if (hasOverride) {
        upsertPayload.push({
          restaurant_id: restaurantId,
          branch_id: branchId,
          item_id: entry.itemId,
          price,
          secondary_price: secondaryPrice,
          is_available: isAvailable,
          display_order: displayOrder,
        });
      } else {
        deleteIds.push(entry.itemId);
      }
    });

    if (upsertPayload.length > 0) {
      const { error: upsertError } = await supabase
        .from("item_branch_overrides")
        .upsert(upsertPayload, { onConflict: "branch_id,item_id" });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message || "Failed to save overrides" },
          { status: 500 }
        );
      }
    }

    if (deleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("item_branch_overrides")
        .delete()
        .eq("branch_id", branchId)
        .in("item_id", deleteIds);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message || "Failed to delete overrides" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN][branch pricing] unexpected", error);
    return NextResponse.json(
      { error: "Failed to save branch pricing" },
      { status: 500 }
    );
  }
}
