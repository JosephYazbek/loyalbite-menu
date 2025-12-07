// lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

type CookieOptions = {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  secure?: boolean;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            console.warn("[supabase] failed to set auth cookie", error);
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...(options ?? {}), maxAge: 0 });
          } catch (error) {
            console.warn("[supabase] failed to remove auth cookie", error);
          }
        },
      },
    }
  );
}
