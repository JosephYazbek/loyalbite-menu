"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BranchHoursEditor,
  OpeningHours,
  ensureOpeningHours,
} from "@/components/branch-hours-editor";
import { BranchQrModal } from "@/components/branch-qr-modal";
import { Button } from "@/components/ui/button";
import { getPublicMenuUrl } from "@/lib/public-menu";
import { slugify } from "@/lib/slug";
import {
  COUNTRY_OPTIONS,
  formatInternationalNumber,
  sanitizeDigits,
  splitInternationalNumber,
} from "@/lib/phone-utils";

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
  primary_color: string | null;
  logo_url: string | null;
  default_language: "en" | "ar" | "both" | null;
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
  phoneCountryCode: string;
  whatsapp: string;
  whatsappCountryCode: string;
  is_active: boolean;
  opening_hours: OpeningHours | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  phoneCountryCode: "+961",
  whatsapp: "",
  whatsappCountryCode: "+961",
  is_active: true,
  opening_hours: ensureOpeningHours(null),
};


export function BranchesClient() {
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedBranchId, setCopiedBranchId] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrBranch, setQrBranch] = useState<BranchRecord | null>(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneTargetBranch, setCloneTargetBranch] = useState<BranchRecord | null>(null);
  const [cloneSourceBranchId, setCloneSourceBranchId] = useState<string>("");
  const [cloneState, setCloneState] = useState<ApiState>({ status: "idle" });

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [apiState, setApiState] = useState<ApiState>({ status: "idle" });
  const defaultLangParam =
    restaurant?.default_language === "ar" ? "ar" : "en";
  const buildPrintUrl = (target: BranchRecord) =>
    restaurant?.slug && target.slug
      ? `/m/${restaurant.slug}/${target.slug}/print?lang=${defaultLangParam}`
      : null;

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
    setFormState({
      ...EMPTY_FORM,
      opening_hours: ensureOpeningHours(null),
    });
    setFormOpen(true);
    setApiState({ status: "idle" });
  };

  const openEditForm = (branch: BranchRecord) => {
    setFormMode("edit");
    const phoneSplit = splitInternationalNumber(branch.phone, "+961");
    const whatsappSplit = splitInternationalNumber(
      branch.whatsapp_number,
      phoneSplit.code
    );
    setFormState({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address ?? "",
      phone: phoneSplit.number,
      phoneCountryCode: phoneSplit.code,
      whatsapp: whatsappSplit.number,
      whatsappCountryCode: whatsappSplit.code,
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
    setFormState({
      ...EMPTY_FORM,
      opening_hours: ensureOpeningHours(null),
    });
  };

  const handleChange = (field: keyof FormState, value: unknown) => {
    setFormState((prev) => {
      if (field === "slug") {
        return { ...prev, slug: slugify(String(value ?? "")) };
      }

      if (field === "phone" || field === "whatsapp") {
        return { ...prev, [field]: sanitizeDigits(String(value ?? "")) };
      }

      const next: FormState = {
        ...prev,
        [field]: value as FormState[typeof field],
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

      const normalizedPhone = formatInternationalNumber(
        formState.phoneCountryCode,
        formState.phone
      );
      const normalizedWhatsapp = formatInternationalNumber(
        formState.whatsappCountryCode,
        formState.whatsapp
      );

      const payload = {
        name: formState.name,
        slug: safeSlug,
        address: formState.address,
        phone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
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

  const handleOpenQrModal = (branch: BranchRecord) => {
    setQrBranch(branch);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = () => {
    setQrModalOpen(false);
    setQrBranch(null);
  };

  const openCloneModal = (branch: BranchRecord) => {
    setCloneTargetBranch(branch);
    const defaultSource =
      branches.find((candidate) => candidate.id !== branch.id) ?? null;
    setCloneSourceBranchId(defaultSource?.id ?? "");
    setCloneState({ status: "idle" });
    setCloneModalOpen(true);
  };

  const closeCloneModal = () => {
    if (cloneState.status === "loading") return;
    setCloneModalOpen(false);
    setCloneTargetBranch(null);
    setCloneSourceBranchId("");
    setCloneState({ status: "idle" });
  };

  const handleCloneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cloneTargetBranch || !cloneSourceBranchId) return;
    setCloneState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/admin/branches/${cloneTargetBranch.id}/clone-menu`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceBranchId: cloneSourceBranchId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setCloneState({
          status: "error",
          message: data.error || "Failed to clone menu.",
        });
        return;
      }
      setCloneState({ status: "success" });
      setCloneModalOpen(false);
      setCloneTargetBranch(null);
      setCloneSourceBranchId("");
      alert("Branch menu cloned.");
    } catch (error) {
      setCloneState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to clone menu.",
      });
    }
  };

  // UI ----------------------

  if (loading) return <p>Loading branches...</p>;
  if (loadError) return <p className="text-red-600">{loadError}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Branches
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage locations, menu URLs, and contact details before sharing with
            guests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openCreateForm}
            size="lg"
            className="h-10 px-6 whitespace-nowrap"
          >
            + Add Branch
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        Branch slugs power the public menu at{" "}
        <span className="font-mono text-foreground">
          /m/&lt;restaurant&gt;/&lt;branch&gt;
        </span>
        . Keep them unique before sharing preview links or QR codes.
      </div>

      {branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
          No branches yet. Add your first location to unlock menu previews and
          QR generation.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {branches.map((branch) => {
            const printUrl = buildPrintUrl(branch);
            return (
              <div
                key={branch.id}
                className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/5 min-w-0"
              >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {branch.name}
                  </p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">
                    /m/{restaurant?.slug}/{branch.slug}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${
                    branch.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {branch.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {branch.address && (
                <p className="text-sm text-muted-foreground">
                  {branch.address}
                </p>
              )}

              {restaurant?.slug ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="text-sm"
                    disabled={!branch.slug}
                    title={
                      branch.slug
                        ? undefined
                        : "Set a slug for this branch to enable QR codes."
                    }
                    onClick={() => handleOpenQrModal(branch)}
                  >
                    QR Code
                  </Button>
                  <Button
                    variant="outline"
                    className="text-sm"
                    disabled={!restaurant.slug}
                    onClick={() =>
                      handleCopyLink(
                        branch.id,
                        getPublicMenuUrl(
                          restaurant.slug,
                          branch.slug,
                          defaultLangParam
                        )
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
                        getPublicMenuUrl(
                          restaurant.slug,
                          branch.slug,
                          defaultLangParam
                        )
                      )
                    }
                  >
                    Preview Menu
                  </Button>
                  <Button
                    variant="outline"
                    className="text-sm"
                    disabled={!printUrl}
                    asChild={Boolean(printUrl)}
                  >
                    {printUrl ? (
                      <Link href={printUrl} target="_blank" rel="noreferrer">
                        Print
                      </Link>
                    ) : (
                      <span>Print</span>
                    )}
                  </Button>
                  {copiedBranchId === branch.id && (
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
                  <Link href={`/admin/branches/${branch.id}/pricing`}>
                    Prices
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCloneModal(branch)}
                  disabled={branches.length <= 1}
                  className="whitespace-nowrap"
                >
                  Clone menu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditForm(branch)}
                  className="whitespace-nowrap"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(branch)}
                  className="whitespace-nowrap"
                >
                  Delete
                </Button>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-xl space-y-6 overflow-auto rounded-2xl bg-card p-6 shadow-xl max-h-[90vh]">
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
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { label: "Phone", codeKey: "phoneCountryCode", numberKey: "phone" },
          {
            label: "WhatsApp",
            codeKey: "whatsappCountryCode",
            numberKey: "whatsapp",
          },
        ].map(({ label, codeKey, numberKey }) => (
          <div key={label} className="space-y-2">
            <label className="text-xs font-medium">{label}</label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,8rem)_1fr]">
              <select
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                value={formState[codeKey as "phoneCountryCode"]}
                onChange={(e) =>
                  handleChange(codeKey as keyof FormState, e.target.value)
                }
                disabled={apiState.status === "loading"}
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={formState[numberKey as "phone"]}
                onChange={(e) =>
                  handleChange(numberKey as keyof FormState, e.target.value)
                }
                className="w-full rounded-2xl border border-border px-3 py-2 text-sm"
                placeholder="e.g. 81336572"
              />
            </div>
          </div>
        ))}
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
                    ? "Creating..."
                    : "Create Branch"
                  : apiState.status === "loading"
                    ? "Saving..."
                    : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      )}

      <BranchQrModal
        open={Boolean(qrModalOpen && qrBranch && restaurant)}
        onClose={handleCloseQrModal}
        restaurantName={restaurant?.name ?? ""}
        restaurantSlug={restaurant?.slug ?? ""}
        restaurantPrimaryColor={restaurant?.primary_color ?? null}
        restaurantDefaultLanguage={(restaurant?.default_language as "en" | "ar" | "both" | null) ?? "en"}
        branchName={qrBranch?.name ?? ""}
        branchSlug={qrBranch?.slug ?? ""}
      />
      {cloneModalOpen && cloneTargetBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Clone menu</h2>
              <button
                onClick={closeCloneModal}
                className="text-sm text-muted-foreground hover:text-foreground"
                disabled={cloneState.status === "loading"}
              >
                Close
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy branch-specific prices, availability, and ordering from
              another branch into <strong>{cloneTargetBranch.name}</strong>.
            </p>
            <form className="space-y-4" onSubmit={handleCloneSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source branch</label>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                  value={cloneSourceBranchId}
                  onChange={(event) => setCloneSourceBranchId(event.target.value)}
                  disabled={cloneState.status === "loading"}
                >
                  <option value="">Select branch</option>
                  {branches
                    .filter((candidate) => candidate.id !== cloneTargetBranch.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Existing overrides for {cloneTargetBranch.name} will be replaced.
                </p>
              </div>
              {cloneState.status === "error" && cloneState.message && (
                <p className="text-sm text-red-500">{cloneState.message}</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCloneModal}
                  disabled={cloneState.status === "loading"}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !cloneSourceBranchId || cloneState.status === "loading"
                  }
                >
                  {cloneState.status === "loading" ? "Cloning..." : "Clone menu"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


