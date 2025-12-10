import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  INVITE_SELECT_FIELDS,
  InviteRecord,
  isInviteExpired,
} from "@/lib/invitations";
import { generateUniqueRestaurantSlug } from "@/lib/slugify";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type Payload = {
  mode?: "create" | "join";
  restaurantName?: string;
  inviteCode?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.mode === "create") {
    return handleCreateMode(supabase, user.id, payload.restaurantName);
  }

  if (payload.mode === "join") {
    return handleJoinMode(supabase, user.email ?? "", user.id, payload.inviteCode);
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

async function handleCreateMode(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  userId: string,
  restaurantName?: string
) {
  const trimmedName = restaurantName?.trim();

  if (!trimmedName) {
    return NextResponse.json(
      { error: "Restaurant name is required." },
      { status: 400 }
    );
  }

  const slug = await generateUniqueRestaurantSlug(supabase, trimmedName);

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .insert({
      name: trimmedName,
      slug,
    })
    .select("id")
    .single();

  if (restaurantError || !restaurant) {
    console.error("[onboarding] failed to create restaurant", restaurantError);
    return NextResponse.json(
      { error: "Failed to create restaurant." },
      { status: 500 }
    );
  }

  const { error: membershipError } = await supabase
    .from("restaurant_users")
    .insert({
      restaurant_id: restaurant.id,
      user_id: userId,
      role: "owner",
    });

  if (membershipError) {
    console.error("[onboarding] failed to add owner membership", membershipError);
    return NextResponse.json(
      { error: "Restaurant created, but failed to link membership." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    redirectUrl: "/admin",
  });
}

async function handleJoinMode(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  email: string,
  userId: string,
  inviteCode?: string
) {
  const code = inviteCode?.trim();
  if (!code) {
    return NextResponse.json(
      { error: "Invite code is required." },
      { status: 400 }
    );
  }

  const adminClient = getSupabaseAdminClient();
  const { data: inviteData, error: inviteError } = await adminClient
    .from("restaurant_invites")
    .select(INVITE_SELECT_FIELDS)
    .eq("code", code)
    .maybeSingle();

  if (inviteError) {
    console.error("[invite] fetch failed", inviteError);
    return NextResponse.json(
      { error: "Unable to validate invite." },
      { status: 500 }
    );
  }

  const invite = inviteData as InviteRecord | null;

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found." },
      { status: 404 }
    );
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite has already been used." },
      { status: 400 }
    );
  }

  if (isInviteExpired(invite)) {
    return NextResponse.json(
      { error: "Invite has expired." },
      { status: 400 }
    );
  }

  if (!email || invite.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite was issued to a different email address." },
      { status: 403 }
    );
  }

  const { error: membershipError } = await supabase
    .from("restaurant_users")
    .insert({
      restaurant_id: invite.restaurant_id,
      user_id: userId,
      role: invite.role ?? "staff",
    });

  if (membershipError && membershipError.code !== "23505") {
    console.error("[onboarding] failed to link invite membership", membershipError);
    return NextResponse.json(
      { error: "Failed to join restaurant." },
      { status: 500 }
    );
  }

  await supabase
    .from("restaurant_invites")
    .update({ used: true })
    .eq("id", invite.id);

  return NextResponse.json({
    success: true,
    redirectUrl: "/admin",
  });
}
