import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const token = url.searchParams.get("token");
  const redirectTo = url.searchParams.get("redirect_to");

  if (!code) {
    return NextResponse.redirect(`${SITE_URL}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("supabase auth callback failed", error);
    return NextResponse.redirect(`${SITE_URL}/login?error=recovery_expired`);
  }

  if (type === "recovery") {
    const redirectUrl = new URL(`${SITE_URL}/login`);
    redirectUrl.searchParams.set("recovery", "1");
    redirectUrl.searchParams.set("type", "recovery");

    if (token) {
      redirectUrl.searchParams.set("token", token);
    }

    return NextResponse.redirect(redirectUrl.toString());
  }

  return NextResponse.redirect(
    redirectTo ? buildAbsoluteUrl(redirectTo) : `${SITE_URL}/admin`
  );
}

function buildAbsoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${SITE_URL}${path}`;
  }

  return `${SITE_URL}/${path}`;
}
