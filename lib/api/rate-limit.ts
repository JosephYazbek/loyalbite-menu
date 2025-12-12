import type { createSupabaseServerClient } from "@/lib/supabaseServer";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;

export async function enforceRateLimit(
  supabase: SupabaseServerClient,
  userId: string,
  endpoint: string,
  limit: number = DEFAULT_LIMIT
) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error: countError } = await supabase
    .from("api_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .gte("created_at", since);

  if (countError) {
    console.warn("[rate-limit] count failed", countError);
    return { ok: true as const };
  }

  if ((count ?? 0) >= limit) {
    return { ok: false as const, status: 429 as const, message: "Too many requests" };
  }

  const { error: insertError } = await supabase.from("api_rate_limits").insert({
    user_id: userId,
    endpoint,
  });

  if (insertError) {
    console.warn("[rate-limit] insert failed", insertError);
  }

  return { ok: true as const };
}
