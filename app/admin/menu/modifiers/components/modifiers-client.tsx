// app/admin/menu/modifiers/components/modifiers-client.tsx

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModifierModal, ModifierFormValues } from "./modifier-modal";

type ModifiersClientProps = {
  initialModifiers: any[];
};

export function ModifiersClient({ initialModifiers }: ModifiersClientProps) {
  const [modifiers, setModifiers] = useState(initialModifiers);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const sortedModifiers = useMemo(
    () =>
      [...modifiers].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
    [modifiers]
  );

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (modifier: any) => {
    setMode("edit");
    setEditing(modifier);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ModifierFormValues) => {
    setLoading(true);
    try {
      const endpoint =
        mode === "create"
          ? "/api/admin/modifiers"
          : `/api/admin/modifiers/${editing?.id}`;

      const res = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save modifier");
        return;
      }

      if (mode === "create") {
        setModifiers((prev) => [...prev, data.modifier]);
      } else {
        setModifiers((prev) =>
          prev.map((m) => (m.id === editing?.id ? data.modifier : m))
        );
      }

      setModalOpen(false);
      setEditing(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modifierId: string) => {
    const confirm = window.confirm("Delete this modifier group?");
    if (!confirm) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/modifiers/${modifierId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to delete modifier");
        return;
      }
      setModifiers((prev) => prev.filter((m) => m.id !== modifierId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Modifier Groups
          </h1>
          <p className="text-sm text-muted-foreground">
            Create add-ons and required choices that can be attached to items.
          </p>
        </div>
        <Button onClick={openCreate}>Create modifier group</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedModifiers.map((modifier) => (
          <div
            key={modifier.id}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {modifier.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Min {modifier.min_choices ?? 0} / Max {modifier.max_choices ?? 1} choices
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(modifier)}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(modifier.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {modifier.options?.length ? (
                modifier.options.map((opt: any) => (
                  <span
                    key={opt.id}
                    className={cn(
                      "rounded-full bg-muted px-3 py-1",
                      "text-foreground"
                    )}
                  >
                    {opt.name}
                    {opt.price != null ? ` (+${opt.price})` : ""}
                  </span>
                ))
              ) : (
                <span>No options added yet.</span>
              )}
            </div>
          </div>
        ))}
        {sortedModifiers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
            No modifier groups yet. Create one to start attaching add-ons to your items.
          </div>
        )}
      </div>

      <ModifierModal
        open={modalOpen}
        mode={mode}
        initialValues={
          editing
            ? {
                id: editing.id,
                name: editing.name,
                min_choices: editing.min_choices ?? 0,
                max_choices: editing.max_choices ?? 1,
                options:
                  editing.options ??
                  editing.modifier_options?.map((opt: any) => ({
                    id: opt.id,
                    name: opt.name,
                    price: opt.price ?? null,
                  })) ?? [{ name: "", price: null }],
              }
            : undefined
        }
        loading={loading}
        onClose={() => {
          if (!loading) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
