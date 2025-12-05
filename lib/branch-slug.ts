import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureSlug } from "./slug";

type BranchLike = {
  id: string;
  name?: string | null;
  slug?: string | null;
};

export async function normalizeBranchSlugs<T extends BranchLike>(
  supabase: SupabaseClient<any>,
  branches: T[]
): Promise<T[]> {
  const updates: Array<{ id: string; slug: string }> = [];

  const normalized = branches.map((branch) => {
    const safeSlug = ensureSlug(branch.slug, branch.name ?? branch.id);
    if (branch.slug !== safeSlug) {
      updates.push({ id: branch.id, slug: safeSlug });
    }
    return { ...branch, slug: safeSlug };
  });

  if (updates.length > 0) {
    await Promise.all(
      updates.map(({ id, slug }) =>
        supabase.from("branches").update({ slug }).eq("id", id)
      )
    );
  }

  return normalized;
}
