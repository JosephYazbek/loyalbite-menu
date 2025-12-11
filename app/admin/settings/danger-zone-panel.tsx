"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type DangerZonePanelProps = {
  restaurantId: string;
  restaurantName: string;
  role: string;
};

export function DangerZonePanel({ restaurantId, restaurantName, role }: DangerZonePanelProps) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [status, setStatus] = useState<"idle" | "leaving" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  const closeLeaveModal = () => {
    if (status === "leaving") return;
    setLeaveModalOpen(false);
    setError(null);
  };

  const closeDeleteModal = () => {
    if (status === "deleting") return;
    setDeleteModalOpen(false);
    setConfirmationInput("");
    setError(null);
  };

  const handleLeave = async () => {
    if (status !== "idle") return;
    setStatus("leaving");
    setError(null);

    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/leave`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to leave restaurant.");
      }
      setLeaveModalOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to leave restaurant.");
    } finally {
      setStatus("idle");
    }
  };

  const handleDelete = async () => {
    if (status !== "idle") return;
    setStatus("deleting");
    setError(null);

    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmationInput }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to delete restaurant.");
      }
      setDeleteModalOpen(false);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete restaurant.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 shadow-sm ring-1 ring-black/5">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-destructive">Danger zone</p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">Manage access</h2>
          <p className="text-sm text-muted-foreground">
            Remove yourself from {restaurantName} or permanently delete the workspace. These actions cannot be undone.
          </p>
        </div>

        {!isOwner ? (
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-foreground">Leave this restaurant</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll lose access to the dashboard, menu editor, and analytics immediately.
                </p>
              </div>
              <Button variant="destructive" className="mt-3 md:mt-0" onClick={() => setLeaveModalOpen(true)}>
                Leave restaurant
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-foreground">Delete restaurant</p>
                <p className="text-sm text-muted-foreground">
                  Permanently remove menu data, invites, analytics, and assets for {restaurantName}.
                </p>
              </div>
              <Button variant="destructive" className="mt-3 md:mt-0" onClick={() => setDeleteModalOpen(true)}>
                Delete restaurant
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={leaveModalOpen} onOpenChange={(next) => (next ? setLeaveModalOpen(true) : closeLeaveModal())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {restaurantName}?</DialogTitle>
            <DialogDescription>
              This will remove your membership immediately. You&apos;ll need a new invite to regain access.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeLeaveModal} disabled={status === "leaving"}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeave} disabled={status === "leaving"}>
              {status === "leaving" ? "Leaving..." : "Leave restaurant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={(next) => (next ? setDeleteModalOpen(true) : closeDeleteModal())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {restaurantName}?</DialogTitle>
            <DialogDescription>
              This action removes every branch, menu, invite, analytics event, and asset associated with {restaurantName}.
              Type <span className="font-semibold">confirm delete</span> to continue.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmationInput}
            onChange={(event) => setConfirmationInput(event.target.value)}
            placeholder='Type "confirm delete"'
            className="mt-2"
            disabled={status === "deleting"}
          />
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDeleteModal} disabled={status === "deleting"}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                status === "deleting" ||
                confirmationInput.trim().toLowerCase() !== "confirm delete"
              }
            >
              {status === "deleting" ? "Deleting..." : "Delete restaurant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
