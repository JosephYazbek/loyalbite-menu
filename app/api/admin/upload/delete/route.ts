import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_BUCKETS = new Set(["item-images", "restaurant-assets"]);

function getSupabaseServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
    );
  }

  return createClient(url, serviceRoleKey);
}

function extractPathFromUrl(url: string, expectedBucket: string) {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const afterMarker = url.slice(index + marker.length);
  const [bucket, ...pathParts] = afterMarker.split("/");

  if (bucket !== expectedBucket || pathParts.length === 0) {
    return null;
  }

  return pathParts.join("/");
}

export async function POST(req: Request) {
  try {
    const { bucket, url } = await req.json();

    if (!bucket || typeof bucket !== "string") {
      return NextResponse.json(
        { error: "bucket is required" },
        { status: 400 }
      );
    }

    if (!VALID_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { error: "Invalid bucket" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    const filePath = extractPathFromUrl(url, bucket);
    if (!filePath) {
      return NextResponse.json(
        { error: "Unable to parse storage path from URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();

    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error("[UPLOAD][delete] remove error", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to delete image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[UPLOAD][delete] unexpected error", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
