"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeOption = {
  id: "light" | "dark" | "system";
  label: string;
  description: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    description: "Bright cards and a soft grey canvas.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "High contrast layout for low-light rooms.",
  },
  {
    id: "system",
    label: "System",
    description: "Match your OS preference automatically.",
  },
];

export function ThemeSettingsPanel() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = theme ?? "system";

  const liveDescription = useMemo(() => {
    if (!mounted) return null;
    if (activeTheme === "system" && systemTheme) {
      return `Currently following ${systemTheme} mode.`;
    }
    if (activeTheme !== "system") {
      return `Applied ${activeTheme} mode instantly across the dashboard.`;
    }
    return null;
  }, [activeTheme, mounted, systemTheme]);

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Choose how LoyalBite renders for every admin page. Changes apply
          instantly.
        </p>
        {liveDescription ? (
          <p className="text-xs text-slate-500">{liveDescription}</p>
        ) : null}
      </div>

      {mounted ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((option) => {
            const isActive = activeTheme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cn(
                  "rounded-2xl border px-4 py-5 text-left transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                    : "border-slate-200 bg-white/80 text-slate-700"
                )}
              >
                <p className="text-base font-semibold">{option.label}</p>
                <p
                  className={cn(
                    "mt-2 text-sm",
                    isActive ? "text-white/80" : "text-slate-500"
                  )}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-28 rounded-2xl bg-muted/50" />
          <div className="h-28 rounded-2xl bg-muted/40 sm:col-span-2" />
        </div>
      )}
    </section>
  );
}
