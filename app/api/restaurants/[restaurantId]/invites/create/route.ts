import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";
import { sendInviteEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const INVITE_EXPIRY_MS = 30 * 60 * 1000;

type MembershipRecord = {
  role: string;
  restaurant?: { name?: string | null } | { name?: string | null }[] | null;
};

interface RouteContext {
  params: Promise<{ restaurantId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { restaurantId } = await context.params;

  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurant id." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select(
      `
      role,
      restaurant:restaurant_id (
        name
      )
    `
    )
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const inviteCode = randomUUID();
  const supabaseAdmin = getSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from("restaurant_invites")
    .insert({
      restaurant_id: restaurantId,
      email,
      role,
      code: inviteCode,
      expires_at: expiresAt,
      used: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const inviteLink = `${SITE_URL}/join?code=${inviteCode}`;
  const typedMembership = membership as MembershipRecord | null;
  const restaurantSource = Array.isArray(typedMembership?.restaurant)
    ? typedMembership?.restaurant?.[0] ?? null
    : typedMembership?.restaurant ?? null;
  const restaurantName = restaurantSource?.name ?? "your LoyalBite workspace";

  const emailResult = await sendInviteEmail({
    to: email,
    restaurantName,
    inviteLink,
    expiresAt,
  });

  return NextResponse.json(
    {
      invite: data,
      link: inviteLink,
      emailSent: emailResult.sent,
    },
    { status: 200 }
  );
}
