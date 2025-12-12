import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "restaurant-assets";

const SUPPORTED_KINDS = new Set(["logo", "cover"]);

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
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable (service role key required for uploads)"
    );
  }

  return createClient(url, serviceRoleKey);
}

function buildFilePath(
  restaurantId: string,
  kind: "logo" | "cover",
  mimeType: string
) {
  const extension =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";

  return `restaurant_${restaurantId}/${kind}.${extension}`;
}

function extractPathFromPublicUrl(url: string, expectedBucket: string) {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const afterMarker = url.slice(idx + marker.length);
  const withoutQuery = afterMarker.split("?")[0]?.split("#")[0] ?? "";
  const [bucket, ...pathParts] = withoutQuery.split("/");

  if (bucket !== expectedBucket || pathParts.length === 0) {
    return null;
  }

  return pathParts.join("/");
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServiceClient();
    const formData = await request.formData();

    const restaurantId = formData.get("restaurantId");
    const kind = formData.get("kind");
    const file = formData.get("file");
    const existingUrl = formData.get("existingUrl");

    if (!restaurantId || typeof restaurantId !== "string") {
      return NextResponse.json(
        { error: "restaurantId is required" },
        { status: 400 }
      );
    }

    if (!kind || typeof kind !== "string" || !SUPPORTED_KINDS.has(kind)) {
      return NextResponse.json(
        { error: "Invalid asset kind. Expected logo or cover." },
        { status: 400 }
      );
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large (max 5MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const filePath = buildFilePath(
      restaurantId,
      kind as "logo" | "cover",
      file.type
    );
    const buffer = Buffer.from(await file.arrayBuffer());

    const previousPath =
      typeof existingUrl === "string"
        ? extractPathFromPublicUrl(existingUrl, BUCKET)
        : null;

    if (previousPath) {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove([previousPath]);

      if (deleteError) {
        console.error("[UPLOAD][restaurant-asset] remove error", deleteError);
        return NextResponse.json(
          {
            error:
              deleteError.message ?? "Failed to remove previous restaurant asset",
          },
          { status: 500 }
        );
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[UPLOAD][restaurant-asset] upload error", uploadError);
      return NextResponse.json(
        { error: uploadError.message ?? "Failed to upload file" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`;

    return NextResponse.json({ url: cacheBustedUrl });
  } catch (error) {
    console.error("[UPLOAD][restaurant-asset] unexpected", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
