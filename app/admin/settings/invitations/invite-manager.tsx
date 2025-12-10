"use client";

import { FormEvent, useMemo, useState } from "react";

type InviteRecord = {
  id: string;
  email: string;
  role: string;
  code: string;
  expiresAt: string | null;
  createdAt: string | null;
  used: boolean;
};

type MemberRecord = {
  id: string;
  userId: string;
  role: string;
  email: string;
};

type Props = {
  restaurantId: string;
  invites: InviteRecord[];
  members: MemberRecord[];
  currentUserId: string;
};

export function InviteManager({
  restaurantId,
  invites,
  members,
  currentUserId,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [records, setRecords] = useState(invites);
  const [memberList, setMemberList] = useState(members);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInviteLink(null);
    setActionMessage(null);
    setActionError(null);
    const invitedEmail = email;

    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/invites/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            role,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Failed to create invite.");
        return;
      }

      setInviteLink(payload.link ?? null);
      setEmail("");
      setRole("staff");
      const inviteData = payload.invite;
      if (inviteData) {
        setRecords((current) => [
          {
            id: inviteData.id,
            code: inviteData.code,
            email: inviteData.email,
            role: inviteData.role,
            used: inviteData.used,
            expiresAt: inviteData.expires_at,
            createdAt: inviteData.created_at,
          },
          ...current,
        ]);
      }
      setActionMessage(
        payload.emailSent
          ? `Invite emailed to ${invitedEmail}.`
          : "Invite created. Copy or share the link manually."
      );
    } finally {
      setPending(false);
    }
  };

  const isInviteExpired = (invite: InviteRecord) => {
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt).getTime() < Date.now();
  };

  const pendingInvites = useMemo(
    () => records.filter((invite) => !invite.used && !isInviteExpired(invite)),
    [records]
  );

  const handleRevokeInvite = async (inviteId: string) => {
    setActionMessage(null);
    setActionError(null);
    setRevokingId(inviteId);
    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/invites/${inviteId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? "Failed to revoke invite. Please try again."
        );
      }
      setRecords((current) =>
        current.filter((invite) => invite.id !== inviteId)
      );
      setActionMessage("Invite revoked.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to revoke invite."
      );
    } finally {
      setRevokingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setActionMessage(null);
    setActionError(null);
    setRemovingId(memberId);
    try {
      const response = await fetch(
        `/api/restaurants/${restaurantId}/members/${memberId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error ?? "Failed to remove team member. Please try again."
        );
      }
      setMemberList((current) =>
        current.filter((member) => member.id !== memberId)
      );
      setActionMessage("Team member removed.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove member."
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleCopyLink = (invite: InviteRecord) => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/join?code=${invite.code}`
        : `${invite.code}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => setActionMessage("Invite link copied to clipboard."))
      .catch(() =>
        setActionError("Unable to copy link. Please copy the code manually.")
      );
  };

  return (
    <div className="space-y-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Teammate email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="person@restaurant.com"
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Role
          </label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
          >
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {inviteLink && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Invite ready! Share this URL:{" "}
            <span className="font-semibold">{inviteLink}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Generating..." : "Generate invite link"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Invite links expire after 30 minutes.
        </p>
      </form>

      <div className="space-y-3">
        {actionError && <p className="text-sm text-red-500">{actionError}</p>}
        {actionMessage && (
          <p className="text-sm text-emerald-600">{actionMessage}</p>
        )}
        <h2 className="text-base font-semibold text-foreground">
          Active invites ({pendingInvites.length})
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invites created yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {records.map((invite) => (
              <li
                key={`${invite.code}-${invite.email}`}
                className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{invite.email}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {invite.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        invite.used || isInviteExpired(invite)
                          ? "bg-slate-200 text-slate-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {invite.used
                        ? "Used"
                        : isInviteExpired(invite)
                          ? "Expired"
                          : "Pending"}
                    </span>
                    {!invite.used && !isInviteExpired(invite) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(invite)}
                          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:border-foreground"
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={revokingId === invite.id}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {revokingId === invite.id ? "Revoking..." : "Revoke"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground break-all">
                  Code: {invite.code}
                </p>
                {invite.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(invite.expiresAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Team members ({memberList.length})
        </h2>
        {memberList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members have joined yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {memberList.map((member) => {
              const canRemove =
                member.role !== "owner" && member.userId !== currentUserId;
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-foreground">{member.email}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {member.role}
                  </p>
                </div>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingId === member.id}
                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {removingId === member.id ? "Removing..." : "Remove"}
                  </button>
                ) : null}
              </li>
            );
          })}
          </ul>
        )}
      </div>
    </div>
  );
}
