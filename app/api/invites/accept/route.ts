import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  fetchInviteByCode,
  isInviteExpired,
} from "@/lib/invitations";

type Payload = {
  code?: string;
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

  const code = payload.code?.trim();

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const invite = await fetchInviteByCode(supabase, code);

  if (!invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (invite.used) {
    return NextResponse.json(
      { error: "Invite has already been used." },
      { status: 400 }
    );
  }

  if (isInviteExpired(invite)) {
    return NextResponse.json({ error: "Invite expired." }, { status: 400 });
  }

  if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      { error: "Invite email does not match your account." },
      { status: 403 }
    );
  }

  const { error: membershipError } = await supabase
    .from("restaurant_users")
    .insert({
      restaurant_id: invite.restaurant_id,
      user_id: user.id,
      role: invite.role ?? "staff",
    });

  if (membershipError && membershipError.code !== "23505") {
    console.error("[invite] failed to accept", membershipError);
    return NextResponse.json(
      { error: "Failed to accept invite." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("restaurant_invites")
    .update({ used: true })
    .eq("id", invite.id);

  if (updateError) {
    console.error("[invite] failed to mark invite used", updateError);
  }

  return NextResponse.json({
    success: true,
    redirectUrl: "/admin",
  });
}
