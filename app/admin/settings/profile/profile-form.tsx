"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  uploadRestaurantAsset,
  removeRestaurantAsset,
} from "@/lib/client-uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  parseRestaurantProfileMeta,
  serializeRestaurantProfileMeta,
} from "@/lib/restaurant-profile";
import { getPublicMicrositeUrl } from "@/lib/public-menu";

type RestaurantProfile = {
  id: string;
  name: string;
  slug: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  profileMeta: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  website: string | null;
  primaryColor: string | null;
  defaultLanguage: "en" | "ar" | "both";
  logoUrl: string | null;
  coverImageUrl: string | null;
};

type ProfileFormProps = {
  restaurant: RestaurantProfile;
};

const COUNTRY_OPTIONS = [
  { value: "+961", label: "Lebanon (+961)" },
  { value: "+971", label: "UAE (+971)" },
  { value: "+966", label: "Saudi (+966)" },
  { value: "+965", label: "Kuwait (+965)" },
  { value: "+974", label: "Qatar (+974)" },
  { value: "+962", label: "Jordan (+962)" },
  { value: "+90", label: "Turkey (+90)" },
  { value: "+1", label: "USA / Canada (+1)" },
];

const sanitizeDigits = (value: string) => value.replace(/[^\d]/g, "");

const splitInternationalNumber = (raw: string | null, fallback: string) => {
  if (!raw) return { code: fallback, number: "" };
  const trimmed = raw.trim();
  const intlMatch = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (intlMatch) {
    return {
      code: intlMatch[1],
      number: sanitizeDigits(intlMatch[2]),
    };
  }
  return {
    code: fallback,
    number: sanitizeDigits(trimmed),
  };
};

const formatInternationalNumber = (code: string, digits: string) => {
  const normalized = sanitizeDigits(digits);
  if (!normalized) return null;
  if (!code.startsWith("+")) {
    return `+${code}${normalized}`;
  }
  return `${code}${normalized}`;
};

const LANGUAGE_OPTIONS: Array<{ value: "en" | "ar" | "both"; label: string }> =
  [
    { value: "en", label: "English first" },
    { value: "ar", label: "Arabic first" },
    { value: "both", label: "Support both languages" },
  ];

export function ProfileForm({ restaurant }: ProfileFormProps) {
  const profileMeta = parseRestaurantProfileMeta(restaurant.profileMeta);
  const phoneSplit = splitInternationalNumber(
    restaurant.phone,
    profileMeta.phoneCountryCode ?? "+961"
  );
  const whatsappSplit = splitInternationalNumber(
    restaurant.whatsappPhone,
    profileMeta.whatsappCountryCode ?? profileMeta.phoneCountryCode ?? "+961"
  );

  const [formState, setFormState] = useState({
    descriptionEn: restaurant.descriptionEn ?? "",
    descriptionAr: restaurant.descriptionAr ?? "",
    email: restaurant.email ?? "",
    website: restaurant.website ?? "",
    primaryColor: restaurant.primaryColor ?? "#0F172B",
    defaultLanguage: restaurant.defaultLanguage ?? "en",
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    phoneSplit.code || "+961"
  );
  const [phoneDigits, setPhoneDigits] = useState(phoneSplit.number);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState(
    whatsappSplit.code || phoneSplit.code || "+961"
  );
  const [whatsappDigits, setWhatsappDigits] = useState(whatsappSplit.number);
  const [socialLinks, setSocialLinks] = useState({
    instagram: profileMeta.socials?.instagram ?? "",
    facebook: profileMeta.socials?.facebook ?? "",
    tiktok: profileMeta.socials?.tiktok ?? "",
    twitter: profileMeta.socials?.twitter ?? "",
    youtube: profileMeta.socials?.youtube ?? "",
  });
  const resolvedMicrositeLanguage =
    formState.defaultLanguage === "ar" ? "ar" : "en";
  const micrositeUrl = getPublicMicrositeUrl(
    restaurant.slug,
    resolvedMicrositeLanguage
  );
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedMicrosite, setCopiedMicrosite] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!copiedMicrosite) return;
    const timer = setTimeout(() => setCopiedMicrosite(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedMicrosite]);

  const handleChange =
    (field: keyof typeof formState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };
  const handleSocialChange =
    (field: keyof typeof socialLinks) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSocialLinks((prev) => ({ ...prev, [field]: value }));
    };
  const handleCopyMicrosite = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(micrositeUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = micrositeUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopiedMicrosite(true);
    } catch (error) {
      console.error("Failed to copy microsite link", error);
    }
  };

  const uploadAsset = async (kind: "logo" | "cover", file: File) => {
    const setUploading = kind === "logo" ? setLogoUploading : setCoverUploading;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const uploadedUrl = await uploadRestaurantAsset({
        restaurantId: restaurant.id,
        kind,
        file,
        existingUrl: kind === "logo" ? formState.logoUrl : formState.coverImageUrl,
      });
      setFormState((prev) => ({
        ...prev,
        logoUrl: kind === "logo" ? uploadedUrl : prev.logoUrl,
        coverImageUrl: kind === "cover" ? uploadedUrl : prev.coverImageUrl,
      }));
      setMessage(
        kind === "logo" ? "Logo updated successfully." : "Cover updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload asset. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelection =
    (kind: "logo" | "cover") =>
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await uploadAsset(kind, file);
      event.target.value = "";
    };

  const removeAsset = async (kind: "logo" | "cover") => {
    const targetUrl =
      kind === "logo" ? formState.logoUrl : formState.coverImageUrl;
    if (!targetUrl) return;
    setError(null);
    setMessage(null);
    try {
      await removeRestaurantAsset(targetUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove asset from storage."
      );
    } finally {
      setFormState((prev) => ({
        ...prev,
        logoUrl: kind === "logo" ? null : prev.logoUrl,
        coverImageUrl: kind === "cover" ? null : prev.coverImageUrl,
      }));
      setMessage("Asset removed. Be sure to save your changes.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const normalizedPhone = formatInternationalNumber(
      phoneCountryCode,
      phoneDigits
    );
    const normalizedWhatsapp = formatInternationalNumber(
      whatsappCountryCode,
      whatsappDigits
    );

    const serializedMeta = serializeRestaurantProfileMeta({
      phoneCountryCode,
      whatsappCountryCode,
      socials: socialLinks,
    });

    try {
      const response = await fetch("/api/admin/restaurants/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description_en: formState.descriptionEn,
          description_ar: formState.descriptionAr,
          phone: normalizedPhone ?? "",
          whatsapp_phone: normalizedWhatsapp ?? "",
          email: formState.email,
          website: formState.website,
          primary_color: formState.primaryColor,
          default_language: formState.defaultLanguage,
          logo_url: formState.logoUrl,
          cover_image_url: formState.coverImageUrl,
          contact_phone: normalizedPhone ?? "",
          contact_whatsapp: normalizedWhatsapp ?? "",
          contact_email: formState.email,
          profile_meta: serializedMeta,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to update restaurant");
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while saving changes."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Restaurant profile
          </h2>
          <p className="text-sm text-muted-foreground">
            Name and slug are managed during onboarding. Update descriptions as
            needed for the public hero.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="restaurant-name">Name</Label>
            <Input
              id="restaurant-name"
              value={restaurant.name}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>
          <div>
            <Label htmlFor="restaurant-slug">Slug</Label>
            <Input
              id="restaurant-slug"
              value={restaurant.slug}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="description-en">Description (English)</Label>
            <Textarea
              id="description-en"
              rows={4}
              value={formState.descriptionEn}
              onChange={handleChange("descriptionEn")}
              placeholder="Short tagline or positioning"
            />
          </div>
          <div>
            <Label htmlFor="description-ar">Description (Arabic)</Label>
            <Textarea
              id="description-ar"
              rows={4}
              value={formState.descriptionAr}
              onChange={handleChange("descriptionAr")}
              placeholder="سطر موجز للتعريف بالمطعم"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p className="text-sm text-muted-foreground">
            These details appear on the menu header and power WhatsApp contact
            buttons.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="flex gap-2">
              <select
                className="w-36 rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                value={phoneCountryCode}
                onChange={(event) => setPhoneCountryCode(event.target.value)}
                disabled={saving}
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                id="phone"
                value={phoneDigits}
                onChange={(event) =>
                  setPhoneDigits(sanitizeDigits(event.target.value))
                }
                placeholder="813 555 010"
                disabled={saving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <div className="flex gap-2">
              <select
                className="w-36 rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                value={whatsappCountryCode}
                onChange={(event) => setWhatsappCountryCode(event.target.value)}
                disabled={saving}
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                id="whatsapp"
                value={whatsappDigits}
                onChange={(event) =>
                  setWhatsappDigits(sanitizeDigits(event.target.value))
                }
                placeholder="812 600 120"
                disabled={saving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formState.email}
              onChange={handleChange("email")}
              placeholder="hello@loyalbite.app"
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formState.website}
              onChange={handleChange("website")}
              placeholder="https://"
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={socialLinks.instagram}
              onChange={handleSocialChange("instagram")}
              placeholder="https://instagram.com/loyalbite"
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              value={socialLinks.facebook}
              onChange={handleSocialChange("facebook")}
              placeholder="https://facebook.com/loyalbite"
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              value={socialLinks.tiktok}
              onChange={handleSocialChange("tiktok")}
              placeholder="https://tiktok.com/@loyalbite"
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="twitter">Twitter / X</Label>
            <Input
              id="twitter"
              value={socialLinks.twitter}
              onChange={handleSocialChange("twitter")}
              placeholder="https://x.com/loyalbite"
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              id="youtube"
              value={socialLinks.youtube}
              onChange={handleSocialChange("youtube")}
              placeholder="https://youtube.com/@loyalbite"
              disabled={saving}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
          <p className="text-sm text-muted-foreground">
            Control hero accents, default menu language, and featured artwork.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="primary-color"
                type="color"
                value={formState.primaryColor}
                onChange={handleChange("primaryColor")}
                className="h-11 w-24 cursor-pointer rounded-2xl border border-border bg-card"
                disabled={saving}
              />
              <Input
                value={formState.primaryColor}
                onChange={handleChange("primaryColor")}
                disabled={saving}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="default-language">Default language</Label>
            <select
              id="default-language"
              value={formState.defaultLanguage}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  defaultLanguage: event.target
                    .value as (typeof formState.defaultLanguage),
                }))
              }
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              disabled={saving}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <BrandingCard
            title="Logo"
            description="Square image used across admin and the public hero."
            imageUrl={formState.logoUrl}
            uploading={logoUploading}
            onUploadClick={() => logoInputRef.current?.click()}
            onRemove={() => removeAsset("logo")}
          />
          <BrandingCard
            title="Cover"
            description="Backdrop for the public hero section."
            imageUrl={formState.coverImageUrl}
            uploading={coverUploading}
            onUploadClick={() => coverInputRef.current?.click()}
            onRemove={() => removeAsset("cover")}
          />
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileSelection("logo")}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileSelection("cover")}
        />
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Public micro-site
          </h2>
          <p className="text-sm text-muted-foreground">
            Share a branded landing page that highlights your branches,
            contact info, and WhatsApp CTA.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex-1 truncate text-sm text-slate-800">
            {micrositeUrl}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyMicrosite}
            >
              {copiedMicrosite ? "Copied" : "Copy URL"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                window.open(micrositeUrl, "_blank", "noopener,noreferrer")
              }
            >
              Preview
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm">
          {message ? (
            <p className="text-emerald-600">{message}</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p className="text-muted-foreground">
              Changes save instantly for all admins and menu visitors.
            </p>
          )}
        </div>
        <Button type="submit" disabled={saving || logoUploading || coverUploading}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

type BrandingCardProps = {
  title: string;
  description: string;
  imageUrl: string | null;
  uploading: boolean;
  onUploadClick: () => void;
  onRemove: () => void;
};

const BrandingCard = ({
  title,
  description,
  imageUrl,
  uploading,
  onUploadClick,
  onRemove,
}: BrandingCardProps) => (
  <div className="rounded-2xl border border-border bg-background/60 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUploadClick}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          disabled={!imageUrl || uploading}
        >
          Remove
        </Button>
      </div>
    </div>
    <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-border/80 bg-slate-100">
      {imageUrl ? (
        <div className="relative h-40 w-full">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No image uploaded yet.
        </div>
      )}
    </div>
  </div>
);
