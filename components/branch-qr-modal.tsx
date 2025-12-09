"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getPublicMenuUrl,
  getPublicMicrositeUrl,
} from "@/lib/public-menu";

type BranchQrModalProps = {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantSlug: string;
  restaurantDefaultLanguage: "en" | "ar" | "both" | null;
  restaurantPrimaryColor?: string | null;
  branchName: string;
  branchSlug: string;
};

const SIZE_PRESETS = [
  { id: "small", label: "Small", dimension: 220, margin: 6 },
  { id: "large", label: "Large", dimension: 300, margin: 8 },
];

const THEME_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

type RgbColor = { r: number; g: number; b: number };

const hexToRgb = (color: string): RgbColor | null => {
  if (!color) return null;
  const hex = color.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
};

const rgbToHex = ({ r, g, b }: RgbColor) =>
  `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

const getRelativeLuminance = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  const srgb = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

const lightenHex = (color: string, factor = 0.6) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const lightenChannel = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * factor));
  return rgbToHex({
    r: lightenChannel(rgb.r),
    g: lightenChannel(rgb.g),
    b: lightenChannel(rgb.b),
  });
};

const ensureDarkThemeContrast = (color: string) => {
  const luminance = getRelativeLuminance(color);
  if (luminance !== null && luminance < 0.45) {
    return lightenHex(color, 0.7);
  }
  return color;
};

export function BranchQrModal({
  open,
  onClose,
  restaurantName,
  restaurantSlug,
  restaurantDefaultLanguage,
  restaurantPrimaryColor,
  branchName,
  branchSlug,
}: BranchQrModalProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sizePreset, setSizePreset] =
    useState<(typeof SIZE_PRESETS)[number]>(SIZE_PRESETS[1]);
  const [useBrandColor, setUseBrandColor] = useState<boolean>(false);
  const [destination, setDestination] = useState<"menu" | "microsite">("menu");
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTheme("light");
    setSizePreset(SIZE_PRESETS[1]);
    setDestination("menu");
    setUseBrandColor(Boolean(restaurantPrimaryColor));
    setCopied(false);
  }, [open, restaurantPrimaryColor]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const accentColor = useMemo(() => {
    if (useBrandColor && restaurantPrimaryColor) {
      return theme === "dark"
        ? ensureDarkThemeContrast(restaurantPrimaryColor)
        : restaurantPrimaryColor;
    }
    return theme === "dark" ? "#f8fafc" : "#0f172a";
  }, [theme, useBrandColor, restaurantPrimaryColor]);

  const backgroundColor = theme === "dark" ? "#0f172a" : "#ffffff";
  const resolvedLanguage =
    restaurantDefaultLanguage === "ar" ? "ar" : "en";
  const branchUrl = restaurantSlug && branchSlug
    ? getPublicMenuUrl(restaurantSlug, branchSlug, resolvedLanguage)
    : null;
  const micrositeUrl = restaurantSlug
    ? getPublicMicrositeUrl(restaurantSlug, resolvedLanguage)
    : null;
  const shareUrl =
    destination === "microsite" ? micrositeUrl ?? branchUrl : branchUrl ?? micrositeUrl;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy QR link", error);
      alert("Unable to copy the link. Please copy it manually.");
    }
  };

  const handleDownload = () => {
    if (!shareUrl) return;
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      alert("QR preview is not ready yet.");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const filename =
      destination === "microsite"
        ? `${restaurantSlug || "restaurant"}-site-qr.png`
        : `${restaurantSlug || "restaurant"}-${branchSlug || "branch"}-menu-qr.png`;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="flex flex-col gap-10 p-8 lg:grid lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="w-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  QR Code
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {restaurantName}
                </h2>
                <p className="text-sm text-slate-500">{branchName}</p>
              </div>
              <Button
                variant="ghost"
                className="text-sm text-slate-500 hover:text-slate-900"
                onClick={onClose}
              >
                Close
              </Button>
            </div>

          <p className="mt-3 text-sm text-slate-500">
            Scan to view the menu directly. Recommended print size: 5x5 cm or larger.
          </p>

            <div className="mt-6 flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex-1 min-w-0 truncate text-sm text-slate-700">
                {shareUrl ?? "URL unavailable"}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                onClick={handleCopyLink}
                disabled={!shareUrl}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>

            <div className="mt-6 space-y-6 rounded-3xl border border-border bg-card/60 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Destination
                </p>
                <div className="mt-3 flex gap-2">
                  {[
                    { id: "menu", label: "Branch menu" },
                    { id: "microsite", label: "Restaurant site" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setDestination(option.id as "menu" | "microsite")
                      }
                      className={cn(
                        "flex-1 rounded-2xl border px-3 py-2 text-sm transition",
                        destination === option.id
                          ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Theme
                </p>
                <div className="mt-3 flex gap-2">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTheme(option.id as "light" | "dark")}
                      className={cn(
                        "flex-1 rounded-2xl border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        theme === option.id
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Use brand accent
                  </p>
                  <p className="text-xs text-slate-500">
                    Applies your restaurant primary color if available.
                  </p>
                </div>
                <Switch
                  checked={useBrandColor && Boolean(restaurantPrimaryColor)}
                  onCheckedChange={(checked) => {
                    if (!restaurantPrimaryColor) {
                      setUseBrandColor(false);
                      return;
                    }
                    setUseBrandColor(checked);
                  }}
                  disabled={!restaurantPrimaryColor}
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Size
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {SIZE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSizePreset(preset)}
                      className={cn(
                        "rounded-2xl border px-3 py-2 text-sm transition",
                        sizePreset.id === preset.id
                          ? "border-amber-500 bg-amber-500/10 text-amber-700"
                          : "border-slate-200 text-slate-500 hover:border-slate-400"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={!shareUrl}
                  className="flex-1"
                >
                  Download PNG
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-6 rounded-[32px] border border-border bg-muted/40 px-8 py-10 lg:w-full">
            <div
              className="flex w-full items-center justify-center rounded-3xl p-6 shadow-inner"
              style={{
                background: theme === "dark" ? "#020617" : "#ffffff",
              }}
            >
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={shareUrl ?? "https://loyalbite.menu"}
                size={sizePreset.dimension}
                includeMargin
                marginSize={sizePreset.margin}
                level="M"
                bgColor={backgroundColor}
                fgColor={accentColor}
                style={{ height: sizePreset.dimension, width: sizePreset.dimension }}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-900">
                {restaurantName}
              </p>
              <p className="text-xs text-slate-500">{branchName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
