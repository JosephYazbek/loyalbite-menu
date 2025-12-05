"use client";

import { useEffect, useState } from "react";
import {
  BranchHoursEditor,
  OpeningHours,
  ensureOpeningHours,
} from "@/components/branch-hours-editor";
import { Button } from "@/components/ui/button";
import { getPublicMenuUrl } from "@/lib/public-menu";
import { slugify } from "@/lib/slug";

type BranchRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null; // FIXED
  is_active: boolean;
  opening_hours: OpeningHours | null;
  created_at: string;
  updated_at: string | null;
};

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type ApiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success" };

type FormMode = "create" | "edit";

type FormState = {
  id?: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  whatsapp: string;
  is_active: boolean;
  opening_hours: OpeningHours | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  whatsapp: "",
  is_active: true,
  opening_hours: ensureOpeningHours(null),  // ✅ FIXED
};


export function BranchesClient() {
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [apiState, setApiState] = useState<ApiState>({ status: "idle" });

  // Load branches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/branches");
        const body = await res.json();

        if (!res.ok) throw new Error(body.error || "Failed to load branches");

        setRestaurant(body.restaurant ?? null);
        setBranches(body.branches ?? []);

        setLoadError(null);
      } catch (err: unknown) {
        setLoadError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openCreateForm = () => {
    setFormMode("create");
    setFormState(EMPTY_FORM);
    setFormOpen(true);
    setApiState({ status: "idle" });
  };

  const openEditForm = (branch: BranchRecord) => {
    setFormMode("edit");
    setFormState({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      whatsapp: branch.whatsapp_number ?? "",
      is_active: branch.is_active,
      opening_hours: branch.opening_hours
      ? ensureOpeningHours(branch.opening_hours)
      : ensureOpeningHours(null),
    });
    setFormOpen(true);
    setApiState({ status: "idle" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormState(EMPTY_FORM);
  };

  const handleChange = (field: keyof FormState, value: unknown) => {
    setFormState((prev) => {
      if (field === "slug") {
        return { ...prev, slug: slugify(String(value ?? "")) };
      }

      const next: FormState = {
        ...prev,
        [field]: value,
      };

      if (field === "name" && !prev.slug) {
        next.slug = slugify(String(value ?? ""));
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiState({ status: "loading" });

    try {
      const safeSlug = slugify(formState.slug || formState.name);

      const payload = {
        name: formState.name,
        slug: safeSlug,
        address: formState.address,
        phone: formState.phone,
        whatsapp: formState.whatsapp,
        is_active: formState.is_active,
        opening_hours: formState.opening_hours,
      };

      let res: Response;

      if (formMode === "create") {
        res = await fetch("/api/admin/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/branches/${formState.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save branch");

      // Update UI
      if (formMode === "create") {
        setBranches((prev) => [...prev, body]);
      } else {
        setBranches((prev) =>
          prev.map((b) => (b.id === body.id ? body : b))
        );
      }

      setApiState({ status: "success" });
      closeForm();
    } catch (err: unknown) {
      setApiState({ status: "error", message: (err as Error).message });
    }
  };

  const handleDelete = async (branch: BranchRecord) => {
    if (!window.confirm(`Delete branch "${branch.name}"?`)) return;

    const res = await fetch(`/api/admin/branches/${branch.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } else {
      const body = await res.json();
      alert(body.error || "Failed to delete branch");
    }
  };

  useEffect(() => {
    if (!copiedBranchId) return;
    const timeout = setTimeout(() => setCopiedBranchId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedBranchId]);

  const handleCopyLink = async (branchId: string, url: string | null) => {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopiedBranchId(branchId);
    } catch (error) {
      console.error(error);
      alert("Unable to copy link");
    }
  };

  const handlePreview = (url: string | null) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // UI ----------------------

  if (loading) return <p>Loading branches...</p>;
  if (loadError) return <p className="text-red-600">{loadError}</p>;

  return (
    <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold">Branches</h1>
                <p className="text-sm text-gray-600">
                  Manage your branch locations and opening hours.
                </p>
        </div>

        <Button onClick={openCreateForm}>+ Add Branch</Button>
      </div>

      {branches.length === 0 ? (
        <div className="p-6 border rounded-md text-gray-500 text-sm">
          No branches yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{branch.name}</p>
                  <p className="text-xs text-slate-500">
                    /m/{restaurant?.slug}/{branch.slug}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    branch.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {branch.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {branch.address && (
                <p className="text-sm text-slate-600">{branch.address}</p>
              )}

              {restaurant?.slug ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="secondary"
                    className="text-sm"
                    disabled={!restaurant.slug}
                    onClick={() =>
                      handleCopyLink(
                        branch.id,
                        getPublicMenuUrl(restaurant.slug, branch.slug)
                      )
                    }
                  >
                    Copy Menu Link
                  </Button>
                  <Button
                    variant="outline"
                    className="text-sm"
                    onClick={() =>
                      handlePreview(
                        getPublicMenuUrl(restaurant.slug, branch.slug)
                      )
                    }
                  >
                    Preview Menu
                  </Button>
                  {copiedBranchId === branch.id && (
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </div>
              ) : null}

              <div className="flex justify-between text-xs text-slate-500">
                <button
                  onClick={() => openEditForm(branch)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-xl space-y-6 overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold">
                {formMode === "create" ? "Add Branch" : "Edit Branch"}
              </h2>
              <button
                onClick={closeForm}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* name */}
              <div>
                <label className="text-xs font-medium">Name</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* slug */}
              <div>
                <label className="text-xs font-medium">Slug (URL)</label>
                <input
                  type="text"
                  value={formState.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* address */}
              <div>
                <label className="text-xs font-medium">Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* phone / whatsapp */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">WhatsApp</label>
                  <input
                    type="text"
                    value={formState.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                />
                <span className="text-sm">Branch is active</span>
              </div>

              {/* hours */}
              <BranchHoursEditor
                value={formState.opening_hours}
                onChange={(hours) => handleChange("opening_hours", hours)}
              />

              {/* submit */}
              <Button type="submit" disabled={apiState.status === "loading"}>
                {formMode === "create"
                  ? apiState.status === "loading"
                    ? "Creating…"
                    : "Create Branch"
                  : apiState.status === "loading"
                    ? "Saving…"
                    : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


