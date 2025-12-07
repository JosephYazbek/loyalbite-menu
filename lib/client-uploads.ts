type UploadImageArgs = {
  endpoint: string;
  fields: Record<string, string>;
  file: File;
  existingUrl?: string | null;
};

async function uploadImageViaApi({
  endpoint,
  fields,
  file,
  existingUrl,
}: UploadImageArgs) {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  formData.append("file", file);

  if (existingUrl) {
    formData.append("existingUrl", existingUrl);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Image upload failed");
  }

  if (!data.url || typeof data.url !== "string") {
    throw new Error("Upload response missing URL");
  }

  return data.url as string;
}

type ItemImageArgs = {
  restaurantId: string;
  itemId: string;
  file: File;
  existingUrl?: string | null;
};

export function uploadItemImage({
  restaurantId,
  itemId,
  file,
  existingUrl,
}: ItemImageArgs) {
  return uploadImageViaApi({
    endpoint: "/api/admin/upload/item-image",
    fields: {
      restaurantId,
      itemId,
    },
    file,
    existingUrl,
  });
}

type CategoryImageArgs = {
  restaurantId: string;
  categoryId: string;
  file: File;
  existingUrl?: string | null;
};

export function uploadCategoryImage({
  restaurantId,
  categoryId,
  file,
  existingUrl,
}: CategoryImageArgs) {
  return uploadImageViaApi({
    endpoint: "/api/admin/upload/category-image",
    fields: {
      restaurantId,
      categoryId,
    },
    file,
    existingUrl,
  });
}

type DeleteImageArgs = {
  bucket: "item-images" | "restaurant-assets";
  url: string;
};

async function deleteImageViaApi({ bucket, url }: DeleteImageArgs) {
  const response = await fetch("/api/admin/upload/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, url }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Image delete failed");
  }
}

export function removeItemImage(url: string) {
  return deleteImageViaApi({ bucket: "item-images", url });
}

export function removeCategoryImage(url: string) {
  return deleteImageViaApi({ bucket: "restaurant-assets", url });
}

type RestaurantAssetArgs = {
  restaurantId: string;
  kind: "logo" | "cover";
  file: File;
  existingUrl?: string | null;
};

export function uploadRestaurantAsset({
  restaurantId,
  kind,
  file,
  existingUrl,
}: RestaurantAssetArgs) {
  return uploadImageViaApi({
    endpoint: "/api/admin/upload/restaurant-asset",
    fields: { restaurantId, kind },
    file,
    existingUrl,
  });
}

export function removeRestaurantAsset(url: string) {
  return deleteImageViaApi({ bucket: "restaurant-assets", url });
}
