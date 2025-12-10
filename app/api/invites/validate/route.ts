import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  fetchInviteByCode,
  isInviteExpired,
} from "@/lib/invitations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  try {
    const invite = await fetchInviteByCode(supabase, code);

    if (!invite) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    return NextResponse.json({
      invite: {
        code: invite.code,
        email: invite.email,
        role: invite.role,
        used: invite.used,
        expiresAt: invite.expires_at,
        expired: isInviteExpired(invite),
        restaurant: invite.restaurant,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to validate invite." },
      { status: 500 }
    );
  }
}
