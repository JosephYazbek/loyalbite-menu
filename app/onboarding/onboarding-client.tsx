"use client";

import { FormEvent, useState, useTransition } from "react";

type Props = {
  defaultEmail?: string;
  defaultName?: string;
};

type Mode = "create" | "join";

export function OnboardingClient({ defaultEmail, defaultName }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [restaurantName, setRestaurantName] = useState(defaultName ?? "");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          restaurantName: mode === "create" ? restaurantName : undefined,
          inviteCode: mode === "join" ? inviteCode : undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccess("Success! Redirecting you to your workspace...");

      window.location.href = payload.redirectUrl ?? "/admin";
    });
  };

  return (
    <div className="min-h-screen bg-slate-950/95 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800/80 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          LoyalBite Onboarding
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          {mode === "create"
            ? "Create your restaurant workspace"
            : "Join an existing restaurant"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          You are signed in as{" "}
          <span className="font-semibold text-white">{defaultEmail}</span>.
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              mode === "create"
                ? "border-white bg-white text-slate-900"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Create restaurant
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              mode === "join"
                ? "border-white bg-white text-slate-900"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            Join with invite
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {mode === "create" ? (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Restaurant name
              </label>
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                placeholder="e.g. Sunset Bistro"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white focus:outline-none"
              />
              <p className="text-xs text-slate-500">
                We&apos;ll generate a slug automatically and add you as the owner.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Invite code
              </label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Paste the invite code here"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-white focus:outline-none"
              />
              <p className="text-xs text-slate-500">
                Ask your team admin for an invite link if you don&apos;t have one.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {isPending
              ? "Finishing up..."
              : mode === "create"
                ? "Create restaurant"
                : "Join restaurant"}
          </button>
        </form>
      </div>
    </div>
  );
}
