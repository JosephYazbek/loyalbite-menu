"use client";

import { useState, useTransition } from "react";

type InviteInfo = {
  restaurantName: string;
  role: string;
  email: string;
} | null;

type InviteState = "ready" | "expired" | "used" | "email_mismatch" | "not_found";

type InviteClientProps = {
  code: string;
  state: InviteState;
  inviteInfo: InviteInfo;
  emailMatches: boolean;
};

export function InviteClient({
  code,
  state,
  inviteInfo,
  emailMatches,
}: InviteClientProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAccept = state === "ready" && emailMatches;

  const headline = (() => {
    switch (state) {
      case "ready":
        return "You're invited!";
      case "expired":
        return "This invite has expired";
      case "used":
        return "This invite was already used";
      case "email_mismatch":
        return "This invite belongs to a different account";
      default:
        return "Invite not found";
    }
  })();

  const handleAccept = () => {
    if (!canAccept) return;
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Unable to accept invite.");
        return;
      }

      setMessage("Invite accepted! Redirecting...");
      window.location.href = payload.redirectUrl ?? "/admin";
    });
  };

  return (
    <div className="min-h-screen bg-slate-950/95 text-white">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-10 shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            LoyalBite Invitation
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{headline}</h1>

          {inviteInfo ? (
            <div className="mt-6 space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Restaurant:</span>{" "}
                <span className="font-semibold text-white">
                  {inviteInfo.restaurantName}
                </span>
              </p>
              <p>
                <span className="text-slate-400">Role:</span>{" "}
                <span className="font-semibold text-white">
                  {inviteInfo.role}
                </span>
              </p>
              <p>
                <span className="text-slate-400">Invited email:</span>{" "}
                <span className="font-semibold text-white">
                  {inviteInfo.email}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-400">
              We couldn&apos;t find this invite. Double-check the link with your admin.
            </p>
          )}

          {state === "email_mismatch" && (
            <p className="mt-4 text-sm text-amber-400">
              You are logged in as a different email. Log out and sign in with the invited
              email address to continue.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {message && <p className="mt-4 text-sm text-emerald-400">{message}</p>}

          <button
            onClick={handleAccept}
            disabled={!canAccept || isPending}
            className="mt-8 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Joining..." : canAccept ? "Join restaurant" : "Unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
}
