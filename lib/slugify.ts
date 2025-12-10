const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(NON_ALPHANUMERIC, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("./supabaseServer").createSupabaseServerClient>
>;

export async function generateUniqueRestaurantSlug(
  supabase: SupabaseServerClient,
  name: string
) {
  const base = slugify(name) || "restaurant";
  let attempt = 0;
  let candidate = base;

  while (attempt < 20) {
    const { data } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", candidate)
      .limit(1);

    if (!data || data.length === 0) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }

  return `${base}-${Date.now()}`;
}
