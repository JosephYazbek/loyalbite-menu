import { randomBytes } from "crypto";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("./supabaseServer").createSupabaseServerClient>
>;

export const INVITE_SELECT_FIELDS = `
  id,
  restaurant_id,
  email,
  role,
  code,
  expires_at,
  used,
  restaurant:restaurant_id (
    id,
    name,
    slug
  )
`;

export type InviteRecord = {
  id: string;
  restaurant_id: string;
  email: string;
  role: string;
  code: string;
  expires_at: string | null;
  used: boolean;
  restaurant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function generateInviteCode() {
  return randomBytes(16).toString("hex");
}

export function isInviteExpired(invite: InviteRecord) {
  if (!invite.expires_at) return false;
  return new Date(invite.expires_at).getTime() < Date.now();
}

export async function fetchInviteByCode(
  supabase: SupabaseServerClient,
  code: string
) {
  const { data, error } = await supabase
    .from("restaurant_invites")
    .select(INVITE_SELECT_FIELDS)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("[invite] failed to fetch", error);
    throw error;
  }

  return (data as InviteRecord | null) ?? null;
}
