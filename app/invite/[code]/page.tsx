import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  fetchInviteByCode,
  isInviteExpired,
} from "@/lib/invitations";
import { InviteClient } from "./invite-client";

type InvitePageProps = {
  params: { code: string };
};

export default async function InvitePage({ params }: InvitePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/invite/${params.code}`)}`);
  }

  const invite = await fetchInviteByCode(supabase, params.code);

  if (!invite) {
    return (
      <InviteClient
        code={params.code}
        state="not_found"
        inviteInfo={null}
        emailMatches={false}
      />
    );
  }

  const emailMatches =
    invite.email.toLowerCase() === (user.email ?? "").toLowerCase();

  const expired = isInviteExpired(invite);

  return (
    <InviteClient
      code={params.code}
      state={
        invite.used
          ? "used"
          : expired
            ? "expired"
            : emailMatches
              ? "ready"
              : "email_mismatch"
      }
      inviteInfo={{
        restaurantName: invite.restaurant?.name ?? "restaurant",
        role: invite.role ?? "staff",
        email: invite.email,
      }}
      emailMatches={emailMatches}
    />
  );
}
